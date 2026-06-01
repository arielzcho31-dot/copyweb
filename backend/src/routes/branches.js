import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all, logAction } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  res.json(await all('SELECT * FROM sucursales ORDER BY nombre'));
});

router.post('/', async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const id = uuidv4();
  await run('INSERT INTO sucursales (id, nombre, direccion, telefono) VALUES (?, ?, ?, ?)',
    id, nombre, direccion || null, telefono || null);

  logAction(req.user.id, req.user.nombre, 'sucursales', 'crear', id, { nombre });
  res.status(201).json({ id, message: 'Sucursal creada' });
});

router.put('/:id', async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  await run("UPDATE sucursales SET nombre=?, direccion=?, telefono=?, updated_at=NOW() WHERE id=?",
    nombre, direccion, telefono, req.params.id);
  logAction(req.user.id, req.user.nombre, 'sucursales', 'editar', req.params.id, { nombre });
  res.json({ message: 'Sucursal actualizada' });
});

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM sucursales WHERE id = ?', req.params.id);
  logAction(req.user.id, req.user.nombre, 'sucursales', 'eliminar', req.params.id, null);
});

export default router;
