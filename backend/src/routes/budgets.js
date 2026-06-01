import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all, transaction, logAction } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

async function generarNumero() {
  const año = new Date().getFullYear();
  const ultimo = await get("SELECT numero FROM presupuestos WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1", `P-${año}-%`);
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

router.get('/', async (req, res) => {
  const { sucursal_id } = req.query;
  let sql = 'SELECT * FROM presupuestos WHERE 1=1';
  const params = [];
  if (sucursal_id) { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY fecha DESC';
  res.json(await all(sql, ...params));
});

router.get('/:id', async (req, res) => {
  const presupuesto = await get('SELECT * FROM presupuestos WHERE id = ?', req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  presupuesto.items = await all('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?', req.params.id);
  res.json(presupuesto);
});

router.post('/', async (req, res) => {
  const { fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, items, tipo_iva, empresa_id, sucursal_id } = req.body;

  if (!cliente_nombre || !items?.length) {
    return res.status(400).json({ error: 'Nombre del cliente y items requeridos' });
  }

  const id = uuidv4();
  const numero = await generarNumero();
  const total = items.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
  const { iva, subtotal } = calcularIva(total, tipo_iva || '10');

  await transaction(async (tx) => {
    await tx.run(`INSERT INTO presupuestos (id, numero, fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, subtotal, iva, tipo_iva, total, empresa_id, sucursal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, numero, fecha || new Date().toISOString().split('T')[0], cliente_nombre, cliente_ruc || null, cliente_direccion || null, cliente_email || null, notas || null, subtotal, iva, tipo_iva || '10', total, empresa_id || null, sucursal_id || null);

    for (const item of items) {
      await tx.run('INSERT INTO presupuesto_items (id, presupuesto_id, descripcion, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?, ?)',
        uuidv4(), id, item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario);
    }
  });

  logAction(req.user.id, req.user.nombre, 'presupuestos', 'crear', id, { numero, cliente_nombre });
  res.status(201).json({ id, numero, message: 'Presupuesto creado' });
});

router.put('/:id', async (req, res) => {
  const presupuesto = await get('SELECT id FROM presupuestos WHERE id = ?', req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const { fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas, items, tipo_iva, estado } = req.body;

  await transaction(async (tx) => {
    if (items) {
      const total = items.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
      const { iva, subtotal } = calcularIva(total, tipo_iva || presupuesto.tipo_iva || '10');

      await tx.run(`UPDATE presupuestos SET fecha=?, cliente_nombre=?, cliente_ruc=?, cliente_direccion=?, cliente_email=?, notas=?, subtotal=COALESCE(?, subtotal), iva=COALESCE(?, iva), tipo_iva=COALESCE(?, tipo_iva), total=COALESCE(?, total), estado=COALESCE(?, estado), updated_at=NOW() WHERE id=?`,
        fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas,
        subtotal, iva, tipo_iva || presupuesto.tipo_iva, total, estado || null, req.params.id);

      await tx.run('DELETE FROM presupuesto_items WHERE presupuesto_id = ?', req.params.id);
      for (const item of items) {
        await tx.run('INSERT INTO presupuesto_items (id, presupuesto_id, descripcion, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?, ?)',
          uuidv4(), req.params.id, item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario);
      }
    } else {
      await tx.run(`UPDATE presupuestos SET fecha=?, cliente_nombre=?, cliente_ruc=?, cliente_direccion=?, cliente_email=?, notas=?, subtotal=COALESCE(?, subtotal), iva=COALESCE(?, iva), tipo_iva=COALESCE(?, tipo_iva), total=COALESCE(?, total), estado=COALESCE(?, estado), updated_at=NOW() WHERE id=?`,
        fecha, cliente_nombre, cliente_ruc, cliente_direccion, cliente_email, notas,
        null, null, tipo_iva || null, null, estado || null, req.params.id);
    }
  });

  logAction(req.user.id, req.user.nombre, 'presupuestos', 'editar', req.params.id, null);
  res.json({ message: 'Presupuesto actualizado' });
});

router.delete('/:id', async (req, res) => {
  const presupuesto = await get('SELECT id FROM presupuestos WHERE id = ?', req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  await run('DELETE FROM presupuestos WHERE id = ?', req.params.id);
  logAction(req.user.id, req.user.nombre, 'presupuestos', 'eliminar', req.params.id, null);
});

export default router;
