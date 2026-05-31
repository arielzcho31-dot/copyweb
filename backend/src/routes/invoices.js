import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { tipo, mes, anio, tipo_iva, empresa_id, sucursal_id, creado_por } = req.query;
  let sql = `SELECT f.*, e.nombre as empresa_nombre, u.nombre as creado_por_nombre 
    FROM facturas f 
    LEFT JOIN empresas e ON f.empresa_id = e.id 
    LEFT JOIN usuarios u ON f.creado_por = u.id 
    WHERE 1=1`;
  const params = [];

  // Si no es admin, solo ve sus propias facturas (a menos que filtre por sucursal)
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
  if (mes) { sql += " AND strftime('%m', f.fecha) = ?"; params.push(mes.padStart(2, '0')); }
  if (anio) { sql += " AND strftime('%Y', f.fecha) = ?"; params.push(anio); }
  if (empresa_id) { sql += ' AND f.empresa_id = ?'; params.push(empresa_id); }
  if (sucursal_id && req.user.rol === 'admin') { sql += ' AND f.sucursal_id = ?'; params.push(sucursal_id); }
  if (creado_por && req.user.rol === 'admin') { sql += ' AND f.creado_por = ?'; params.push(creado_por); }

  sql += ' ORDER BY f.fecha DESC';
  const facturas = db.prepare(sql).all(...params);
  res.json(facturas);
});

router.get('/resumen', (req, res) => {
  const db = getDb();
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

  if (mes) { sql += " AND strftime('%m', fecha) = ?"; params.push(mes.padStart(2, '0')); }
  if (anio) { sql += " AND strftime('%Y', fecha) = ?"; params.push(anio); }
  if (sucursal_id && req.user.rol === 'admin') { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }

  sql += ' GROUP BY tipo';
  const resumen = db.prepare(sql).all(...params);
  const totalIngresos = resumen.find(r => r.tipo === 'ingreso')?.total || 0;
  const totalEgresos = resumen.find(r => r.tipo === 'egreso')?.total || 0;
  res.json({ resumen, totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const factura = db.prepare(`SELECT f.*, e.nombre as empresa_nombre, u.nombre as creado_por_nombre 
    FROM facturas f 
    LEFT JOIN empresas e ON f.empresa_id = e.id 
    LEFT JOIN usuarios u ON f.creado_por = u.id 
    WHERE f.id = ?`).get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(factura);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, sucursal_id, observacion } = req.body;
  if (!tipo || !numero_factura || !fecha || !monto) {
    return res.status(400).json({ error: 'Faltan campos requeridos: tipo, numero_factura, fecha, monto' });
  }

  const id = uuidv4();
  const creadoPor = req.user.id;
  const sId = sucursal_id || req.user.sucursal_id;

  db.prepare(`INSERT INTO facturas (id, tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, sucursal_id, creado_por, observacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, tipo, numero_factura, fecha, monto, tipo_iva || '10', tipo_pago || 'contado', ruc || null, nombre_cliente || null, cliente_direccion || null, cliente_telefono || null, empresa_id || null, sId || null, creadoPor, observacion || null);

  res.status(201).json({ id, message: 'Factura creada' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, observacion } = req.body;
  const factura = db.prepare('SELECT id FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  db.prepare(`UPDATE facturas SET tipo=?, numero_factura=?, fecha=?, monto=?, tipo_iva=?, tipo_pago=?, ruc=?, nombre_cliente=?, cliente_direccion=?, cliente_telefono=?, empresa_id=?, observacion=?, updated_at=datetime('now') WHERE id=?`)
    .run(tipo, numero_factura, fecha, monto, tipo_iva, tipo_pago, ruc, nombre_cliente, cliente_direccion, cliente_telefono, empresa_id, observacion, req.params.id);

  res.json({ message: 'Factura actualizada' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const factura = db.prepare('SELECT id FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  db.prepare('DELETE FROM facturas WHERE id = ?').run(req.params.id);
  res.json({ message: 'Factura eliminada' });
});

export default router;
