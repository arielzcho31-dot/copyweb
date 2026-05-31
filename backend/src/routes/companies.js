import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const empresas = await all('SELECT * FROM empresas ORDER BY nombre');
  res.json(empresas);
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const results = await all("SELECT * FROM empresas WHERE nombre LIKE ? OR ruc LIKE ? ORDER BY nombre LIMIT 10", `%${q}%`, `%${q}%`);
  res.json(results);
});

router.get('/:id', async (req, res) => {
  const empresa = await get('SELECT * FROM empresas WHERE id = ?', req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(empresa);
});

router.post('/', async (req, res) => {
  const { nombre, ruc, direccion, telefono, email } = req.body;
  if (!nombre || !ruc) return res.status(400).json({ error: 'Nombre y RUC requeridos' });

  const exists = await get('SELECT id FROM empresas WHERE ruc = ?', ruc);
  if (exists) return res.status(400).json({ error: 'RUC ya registrado' });

  const id = uuidv4();
  await run('INSERT INTO empresas (id, nombre, ruc, direccion, telefono, email) VALUES (?, ?, ?, ?, ?, ?)',
    id, nombre, ruc, direccion || null, telefono || null, email || null);

  res.status(201).json({ id, message: 'Empresa creada' });
});

router.put('/:id', async (req, res) => {
  const { nombre, ruc, direccion, telefono, email } = req.body;
  const empresa = await get('SELECT id FROM empresas WHERE id = ?', req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

  await run("UPDATE empresas SET nombre=?, ruc=?, direccion=?, telefono=?, email=?, updated_at=NOW() WHERE id=?",
    nombre, ruc, direccion, telefono, email, req.params.id);

  res.json({ message: 'Empresa actualizada' });
});

router.delete('/:id', async (req, res) => {
  const empresa = await get('SELECT id FROM empresas WHERE id = ?', req.params.id);
  if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

  await run('DELETE FROM empresas WHERE id = ?', req.params.id);
  res.json({ message: 'Empresa eliminada' });
});

export default router;
