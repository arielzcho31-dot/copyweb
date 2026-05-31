import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const empresas = db.prepare('SELECT * FROM empresas ORDER BY nombre').all();
  res.json(empresas);
});

router.get('/search', (req, res) => {
  const db = getDb();
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const results = db.prepare("SELECT * FROM empresas WHERE nombre LIKE ? OR ruc LIKE ? ORDER BY nombre LIMIT 10").all(`%${q}%`, `%${q}%`);
  res.json(results);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(empresa);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { nombre, ruc, direccion, telefono, email } = req.body;
  if (!nombre || !ruc) return res.status(400).json({ error: 'Nombre y RUC requeridos' });

  const exists = db.prepare('SELECT id FROM empresas WHERE ruc = ?').get(ruc);
  if (exists) return res.status(400).json({ error: 'RUC ya registrado' });

  const id = uuidv4();
  db.prepare('INSERT INTO empresas (id, nombre, ruc, direccion, telefono, email) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, nombre, ruc, direccion || null, telefono || null, email || null);

  res.status(201).json({ id, message: 'Empresa creada' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { nombre, ruc, direccion, telefono, email } = req.body;
  const empresa = db.prepare('SELECT id FROM empresas WHERE id = ?').get(req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

  db.prepare('UPDATE empresas SET nombre=?, ruc=?, direccion=?, telefono=?, email=?, updated_at=datetime(\'now\') WHERE id=?')
    .run(nombre, ruc, direccion, telefono, email, req.params.id);

  res.json({ message: 'Empresa actualizada' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const empresa = db.prepare('SELECT id FROM empresas WHERE id = ?').get(req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

  db.prepare('DELETE FROM empresas WHERE id = ?').run(req.params.id);
  res.json({ message: 'Empresa eliminada' });
});

export default router;
