import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function generarNumero() {
  const año = new Date().getFullYear();
  const db = getDb();
  const ultimo = db.prepare("SELECT numero FROM presupuestos WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1").get(`P-${año}-%`);
  let correlativo = 1;
  if (ultimo) {
    const partes = ultimo.numero.split('-');
    correlativo = parseInt(partes[2]) + 1;
  }
  return `P-${año}-${String(correlativo).padStart(4, '0')}`;
}

function calcularIva(total, tipo) {
  if (tipo === 'exonerado' || !tipo) return { iva: 0, subtotal: total };
  const pct = parseInt(tipo);
  const divisor = pct === 10 ? 11 : 21;
  const iva = total / divisor;
  return { iva: Math.round(iva * 100) / 100, subtotal: Math.round((total - iva) * 100) / 100 };
}

router.get('/', (req, res) => {
  const db = getDb();
  const { sucursal_id } = req.query;
  let sql = 'SELECT * FROM presupuestos WHERE 1=1';
  const params = [];
  if (sucursal_id) { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY fecha DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  presupuesto.items = db.prepare('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?').all(req.params.id);
  res.json(presupuesto);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, items, tipo_iva, empresa_id, sucursal_id } = req.body;

  if (!cliente_nombre || !items?.length) {
    return res.status(400).json({ error: 'Nombre del cliente y items requeridos' });
  }

  const id = uuidv4();
  const numero = generarNumero();
  const total = items.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
  const { iva, subtotal } = calcularIva(total, tipo_iva || '10');

  const insertPresupuesto = db.prepare(`INSERT INTO presupuestos (id, numero, fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, subtotal, iva, tipo_iva, total, empresa_id, sucursal_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertItem = db.prepare('INSERT INTO presupuesto_items (id, presupuesto_id, descripcion, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    insertPresupuesto.run(id, numero, fecha || new Date().toISOString().split('T')[0], cliente_nombre, cliente_ruc || null, cliente_direccion || null, cliente_email || null, notas || null, subtotal, iva, tipo_iva || '10', total, empresa_id || null, sucursal_id || null);

    for (const item of items) {
      insertItem.run(uuidv4(), id, item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario);
    }
  });

  transaction();
  res.status(201).json({ id, numero, message: 'Presupuesto creado' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare('SELECT id FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const { fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, items, tipo_iva, estado } = req.body;

  const updatePresupuesto = db.prepare(`UPDATE presupuestos SET fecha=?, cliente_nombre=?, cliente_ruc=?, cliente_direccion=?, cliente_email=?, notas=?, subtotal=COALESCE(?, subtotal), iva=COALESCE(?, iva), tipo_iva=COALESCE(?, tipo_iva), total=COALESCE(?, total), estado=COALESCE(?, estado), updated_at=datetime('now') WHERE id=?`);

  const transaction = db.transaction(() => {
    if (items) {
      const total = items.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
      const { iva, subtotal } = calcularIva(total, tipo_iva || presupuesto.tipo_iva || '10');

      updatePresupuesto.run(fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas,
        subtotal, iva, tipo_iva || presupuesto.tipo_iva, total, estado || null, req.params.id);

      db.prepare('DELETE FROM presupuesto_items WHERE presupuesto_id = ?').run(req.params.id);
      const insertItem = db.prepare('INSERT INTO presupuesto_items (id, presupuesto_id, descripcion, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?, ?)');
      for (const item of items) {
        insertItem.run(uuidv4(), req.params.id, item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario);
      }
    } else {
      updatePresupuesto.run(fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas,
        null, null, tipo_iva || null, null, estado || null, req.params.id);
    }
  });

  transaction();
  res.json({ message: 'Presupuesto actualizado' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare('SELECT id FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  db.prepare('DELETE FROM presupuestos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Presupuesto eliminado' });
});

export default router;
