import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all, logAction } from '../database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { nombre, email, password, rol, sucursal_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const exists = await get('SELECT id FROM usuarios WHERE email = ?', email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  const userCount = await get('SELECT COUNT(*) as count FROM usuarios');
  const userRol = Number(userCount.count) === 0 ? 'admin' : (rol || 'sucursal');

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  await run('INSERT INTO usuarios (id, nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?, ?)',
    id, nombre, email, hashed, userRol, sucursal_id || null);

  logAction(id, nombre, 'usuarios', 'registro', id, { email, rol: userRol });
  res.status(201).json({ id, nombre, email, rol: userRol, token: generateToken({ id, nombre, email, rol: userRol, sucursal_id }) });
});

// Solo admin puede crear usuarios (sucursales)

router.post('/create-user', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear usuarios' });

  const { nombre, email, password, rol, sucursal_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const exists = await get('SELECT id FROM usuarios WHERE email = ?', email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  await run('INSERT INTO usuarios (id, nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?, ?)',
    id, nombre, email, hashed, rol || 'sucursal', sucursal_id || null);

  res.status(201).json({ id, nombre, email, rol });
});

router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const users = await all('SELECT id, nombre, email, rol, sucursal_id FROM usuarios ORDER BY created_at DESC');
  res.json(users);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = await get('SELECT * FROM usuarios WHERE email = ?', email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  res.json({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    sucursal_id: user.sucursal_id,
    token: generateToken(user)
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await get('SELECT id, nombre, email, rol, sucursal_id FROM usuarios WHERE id = ?', req.user.id);
  res.json(user);
});

// Admin: actualizar usuario
router.put('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const { nombre, email, rol, sucursal_id } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email requeridos' });
  await run("UPDATE usuarios SET nombre=?, email=?, rol=?, sucursal_id=? WHERE id=?",
    nombre, email, rol || 'sucursal', sucursal_id || null, req.params.id);
  logAction(req.user.id, req.user.nombre, 'usuarios', 'editar_usuario', req.params.id, { nombre, email, rol });
  res.json({ message: 'Usuario actualizado' });
});

// Admin: eliminar usuario
router.delete('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const target = await get('SELECT id, rol FROM usuarios WHERE id = ?', req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.rol === 'admin' && target.id !== req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar a otro admin' });
  }
  if (target.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  await run('DELETE FROM usuarios WHERE id = ?', req.params.id);
  logAction(req.user.id, req.user.nombre, 'usuarios', 'eliminar_usuario', req.params.id, { targetRol: target.rol });
  res.json({ message: 'Usuario eliminado' });
});

export default router;
