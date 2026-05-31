import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { getDb } from './database.js';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import companyRoutes from './routes/companies.js';
import budgetRoutes from './routes/budgets.js';
import branchRoutes from './routes/branches.js';
import bookRoutes from './routes/books.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Servir frontend compilado en producción
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

// Catch-all para SPA (enviar todo lo que no sea API a index.html)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicializar BD
getDb();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/facturas', invoiceRoutes);
app.use('/api/empresas', companyRoutes);
app.use('/api/presupuestos', budgetRoutes);
app.use('/api/sucursales', branchRoutes);
app.use('/api/libros', bookRoutes);

// Sync endpoint (para multi-sucursal)
app.post('/api/sync', (req, res) => {
  const { tabla, accion, registro_id, datos, sucursal_id } = req.body;
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO sync_log (id, tabla, accion, registro_id, sucursal_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, tabla, accion, registro_id, sucursal_id || null);
  res.json({ message: 'Sync registrado' });
});

app.get('/api/sync/pendientes', (req, res) => {
  const db = getDb();
  const { sucursal_id } = req.query;
  let sql = 'SELECT * FROM sync_log WHERE 1=1';
  const params = [];
  if (sucursal_id) { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY created_at ASC LIMIT 100';
  res.json(db.prepare(sql).all(...params));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
