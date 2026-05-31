import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM sucursales ORDER BY nombre').all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { nombre, direccion, telefono } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const id = uuidv4();
  db.prepare('INSERT INTO sucursales (id, nombre, direccion, telefono) VALUES (?, ?, ?, ?)')
    .run(id, nombre, direccion || null, telefono || null);

  res.status(201).json({ id, message: 'Sucursal creada' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { nombre, direccion, telefono } = req.body;
  db.prepare('UPDATE sucursales SET nombre=?, direccion=?, telefono=?, updated_at=datetime(\'now\') WHERE id=?')
    .run(nombre, direccion, telefono, req.params.id);
  res.json({ message: 'Sucursal actualizada' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sucursales WHERE id = ?').run(req.params.id);
  res.json({ message: 'Sucursal eliminada' });
});

export default router;
