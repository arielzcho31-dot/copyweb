import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { nombre, email, password, rol, sucursal_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const db = getDb();
  const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  // El primer usuario es admin automáticamente
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
  const userRol = userCount === 0 ? 'admin' : (rol || 'sucursal');

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO usuarios (id, nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, nombre, email, hashed, userRol, sucursal_id || null
  );

  res.status(201).json({ id, nombre, email, rol: userRol, token: generateToken({ id, nombre, email, rol: userRol, sucursal_id }) });
});

// Solo admin puede crear usuarios (sucursales)
router.post('/create-user', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear usuarios' });

  const { nombre, email, password, rol, sucursal_id } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const db = getDb();
  const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO usuarios (id, nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, nombre, email, hashed, rol || 'sucursal', sucursal_id || null
  );

  res.status(201).json({ id, nombre, email, rol });
});

// Listar usuarios (admin)
router.get('/users', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const db = getDb();
  const users = db.prepare('SELECT id, nombre, email, rol, sucursal_id FROM usuarios ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
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

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, nombre, email, rol, sucursal_id FROM usuarios WHERE id = ?').get(req.user.id);
  res.json(user);
});

export default router;
