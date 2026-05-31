import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all } from '../database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { nombre, email, password, rol, sucursal_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const exists = await get('SELECT id FROM usuarios WHERE email = ?', email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  const userCount = await get('SELECT COUNT(*) as count FROM usuarios');
  const userRol = userCount.count === 0 ? 'admin' : (rol || 'sucursal');

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  await run('INSERT INTO usuarios (id, nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?, ?)',
    id, nombre, email, hashed, userRol, sucursal_id || null);

  res.status(201).json({ id, nombre, email, rol: userRol, token: generateToken({ id, nombre, email, rol: userRol, sucursal_id }) });
});

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

export default router;
