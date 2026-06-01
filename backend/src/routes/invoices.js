import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all, logAction } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { tipo, mes, anio, tipo_iva, empresa_id, sucursal_id, creado_por } = req.query;
  let sql = `SELECT f.*, e.nombre as empresa_nombre, u.nombre as creado_por_nombre 
    FROM facturas f 
    LEFT JOIN empresas e ON f.empresa_id = e.id 
    LEFT JOIN usuarios u ON f.creado_por = u.id 
    WHERE 1=1`;
  const params = [];

  if (req.user.rol !== 'admin') {
    if (req.user.sucursal_id) {
      sql += ' AND f.sucursal_id = ?';
      params.push(req.user.sucursal_id);
    } else {
      sql += ' AND f.creado_por = ?';
      params.push(req.user.id);
    }
  }

  if (tipo) { sql += ' AND f.tipo = ?'; params.push(tipo); }
  if (tipo_iva) { sql += ' AND f.tipo_iva = ?'; params.push(tipo_iva); }
  if (mes) { sql += " AND EXTRACT(MONTH FROM f.fecha) = ?"; params.push(parseInt(mes)); }
  if (anio) { sql += " AND EXTRACT(YEAR FROM f.fecha) = ?"; params.push(parseInt(anio)); }
  if (empresa_id) { sql += ' AND f.empresa_id = ?'; params.push(empresa_id); }
  if (sucursal_id && req.user.rol === 'admin') { sql += ' AND f.sucursal_id = ?'; params.push(sucursal_id); }
  if (creado_por && req.user.rol === 'admin') { sql += ' AND f.creado_por = ?'; params.push(creado_por); }

  sql += ' ORDER BY f.fecha DESC';
  const facturas = await all(sql, ...params);
  res.json(facturas);
});

router.get('/resumen', async (req, res) => {
  const { mes, anio, sucursal_id } = req.query;
  let sql = `SELECT tipo, COUNT(*) as cantidad, SUM(monto) as total FROM facturas WHERE 1=1`;
  const params = [];

  if (req.user.rol !== 'admin') {
    if (req.user.sucursal_id) {
      sql += ' AND sucursal_id = ?'; params.push(req.user.sucursal_id);
    } else {
      sql += ' AND creado_por = ?'; params.push(req.user.id);
    }
  }

  if (mes) { sql += " AND EXTRACT(MONTH FROM fecha) = ?"; params.push(parseInt(mes)); }
  if (anio) { sql += " AND EXTRACT(YEAR FROM fecha) = ?"; params.push(parseInt(anio)); }
  if (sucursal_id && req.user.rol === 'admin') { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }

  sql += ' GROUP BY tipo';
  const resumen = await all(sql, ...params);
  const totalIngresos = resumen.find(r => r.tipo === 'ingreso')?.total || 0;
  const totalEgresos = resumen.find(r => r.tipo === 'egreso')?.total || 0;
  res.json({ resumen, totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos });
});

router.get('/:id', async (req, res) => {
  const factura = await get(`SELECT f.*, e.nombre as empresa_nombre, u.nombre as creado_por_nombre 
    FROM facturas f 
    LEFT JOIN empresas e ON f.empresa_id = e.id 
    LEFT JOIN usuarios u ON f.creado_por = u.id 
    WHERE f.id = ?`, req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(factura);
});

router.post('/', async (req, res) => {
  const { tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, sucursal_id, observacion } = req.body;
  if (!tipo || !numero_factura || !fecha || !monto) {
    return res.status(400).json({ error: 'Faltan campos requeridos: tipo, numero_factura, fecha, monto' });
  }

  const id = uuidv4();
  const creadoPor = req.user.id;
  const sId = sucursal_id || req.user.sucursal_id;

  await run(`INSERT INTO facturas (id, tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, sucursal_id, creado_por, observacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, tipo, numero_factura, fecha, monto, tipo_iva || '10', tipo_pago || 'contado', ruc || null, nombre_cliente || null, cliente_direccion || null, cliente_telefono || null, empresa_id || null, sId || null, creadoPor, observacion || null);

  logAction(req.user.id, req.user.nombre, 'facturas', 'crear', id, { tipo, numero_factura, monto });
  res.status(201).json({ id, message: 'Factura creada' });
});

router.put('/:id', async (req, res) => {
  const { tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, observacion } = req.body;
  const factura = await get('SELECT id FROM facturas WHERE id = ?', req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  await run(`UPDATE facturas SET tipo=?, numero_factura=?, fecha=?, monto=?, tipo_iva=?, tipo_pago=?, ruc=?, nombre_cliente=?, cliente_direccion=?, cliente_telefono=?, empresa_id=?, observacion=?, updated_at=NOW() WHERE id=?`,
    tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, observacion, req.params.id);

  logAction(req.user.id, req.user.nombre, 'facturas', 'editar', req.params.id, { tipo, numero_factura, monto });
  res.json({ message: 'Factura actualizada' });
});

router.delete('/:id', async (req, res) => {
  const factura = await get('SELECT id FROM facturas WHERE id = ?', req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  await run('DELETE FROM facturas WHERE id = ?', req.params.id);
  logAction(req.user.id, req.user.nombre, 'facturas', 'eliminar', req.params.id, null);
});

export default router;
