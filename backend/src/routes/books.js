import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT * FROM libros WHERE 1=1';
  const params = [];
  if (q) { sql += ' AND (titulo LIKE ? OR autor LIKE ? OR isbn LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY titulo';
  res.json(await all(sql, ...params));
});

router.post('/', async (req, res) => {
  const { titulo, autor, editorial, isbn } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título requerido' });
  const id = uuidv4();
  await run('INSERT INTO libros (id, titulo, autor, editorial, isbn) VALUES (?, ?, ?, ?, ?)',
    id, titulo, autor || null, editorial || null, isbn || null);
  res.status(201).json({ id, message: 'Libro creado' });
});

router.put('/:id', async (req, res) => {
  const { titulo, autor, editorial, isbn } = req.body;
  await run("UPDATE libros SET titulo=?, autor=?, editorial=?, isbn=?, updated_at=NOW() WHERE id=?",
    titulo, autor, editorial, isbn, req.params.id);
  res.json({ message: 'Libro actualizado' });
});

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM ventas_libros WHERE libro_id = ?', req.params.id);
  await run('DELETE FROM libros WHERE id = ?', req.params.id);
  res.json({ message: 'Libro eliminado' });
});

router.get('/ventas', async (req, res) => {
  const { libro_id, sucursal_id, repuesto, desde, hasta } = req.query;
  let sql = `SELECT v.*, l.titulo as libro_titulo, l.autor as libro_autor, s.nombre as sucursal_nombre
    FROM ventas_libros v
    LEFT JOIN libros l ON v.libro_id = l.id
    LEFT JOIN sucursales s ON v.sucursal_id = s.id
    WHERE 1=1`;
  const params = [];

  if (req.user.rol !== 'admin') {
    if (req.user.sucursal_id) { sql += ' AND v.sucursal_id = ?'; params.push(req.user.sucursal_id); }
    else { sql += ' AND v.creado_por = ?'; params.push(req.user.id); }
  }

  if (libro_id) { sql += ' AND v.libro_id = ?'; params.push(libro_id); }
  if (sucursal_id) { sql += ' AND v.sucursal_id = ?'; params.push(sucursal_id); }
  if (repuesto !== undefined && repuesto !== '') { sql += ' AND v.repuesto = ?'; params.push(repuesto); }
  if (desde) { sql += ' AND v.fecha >= ?'; params.push(desde); }
  if (hasta) { sql += ' AND v.fecha <= ?'; params.push(hasta); }
  sql += ' ORDER BY v.fecha DESC';
  res.json(await all(sql, ...params));
});

router.post('/ventas', async (req, res) => {
  const { libro_id, fecha, sucursal_id, repuesto, cantidad, precio, observacion, formato, color } = req.body;
  if (!libro_id) return res.status(400).json({ error: 'Libro requerido' });

  const id = uuidv4();
  await run('INSERT INTO ventas_libros (id, libro_id, fecha, sucursal_id, repuesto, cantidad, precio, creado_por, observacion, formato, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, libro_id, fecha || new Date().toISOString().split('T')[0], sucursal_id || null, repuesto ? 1 : 0, cantidad || 1, precio || 0, req.user.id, observacion || null, formato || 'formato_libro', color || 'blanco_negro');

  res.status(201).json({ id, message: 'Venta registrada' });
});

router.put('/ventas/:id', async (req, res) => {
  const { repuesto, fecha, cantidad, precio, observacion, formato, color } = req.body;
  if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });
  await run("UPDATE ventas_libros SET repuesto=?, fecha=?, cantidad=?, precio=?, observacion=?, formato=?, color=?, created_at=NOW() WHERE id=?",
    repuesto ? 1 : 0, fecha, cantidad || 1, precio || 0, observacion || null, formato || 'formato_libro', color || 'blanco_negro', req.params.id);
  res.json({ message: 'Venta actualizada' });
});

router.delete('/ventas/:id', async (req, res) => {
  await run('DELETE FROM ventas_libros WHERE id = ?', req.params.id);
  res.json({ message: 'Venta eliminada' });
});

export default router;
