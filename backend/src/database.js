import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'facturacion.db');

let db;

export function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sucursales (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'usuario',
      sucursal_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    );

    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      ruc TEXT UNIQUE NOT NULL,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      logo TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facturas (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
      numero_factura TEXT NOT NULL,
      fecha TEXT NOT NULL,
      monto REAL NOT NULL,
      tipo_iva TEXT DEFAULT '10' CHECK(tipo_iva IN ('exonerado', '5', '10')),
      tipo_pago TEXT DEFAULT 'contado' CHECK(tipo_pago IN ('contado', 'credito')),
      ruc TEXT,
      nombre_cliente TEXT,
      empresa_id TEXT,
      sucursal_id TEXT,
      file_path TEXT,
      observacion TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresas(id),
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    );

    CREATE TABLE IF NOT EXISTS presupuestos (
      id TEXT PRIMARY KEY,
      numero TEXT UNIQUE NOT NULL,
      fecha TEXT NOT NULL,
      cliente_nombre TEXT NOT NULL,
      cliente_ruc TEXT,
      cliente_direccion TEXT,
      cliente_email TEXT,
      notas TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      iva REAL NOT NULL DEFAULT 0,
      tipo_iva TEXT DEFAULT '10' CHECK(tipo_iva IN ('exonerado', '5', '10')),
      total REAL NOT NULL DEFAULT 0,
      empresa_id TEXT,
      sucursal_id TEXT,
      estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador','enviado','aceptado','rechazado')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresas(id),
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    );

    CREATE TABLE IF NOT EXISTS presupuesto_items (
      id TEXT PRIMARY KEY,
      presupuesto_id TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_unitario REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      tabla TEXT NOT NULL,
      accion TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      sucursal_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS libros (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT,
      editorial TEXT,
      isbn TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ventas_libros (
      id TEXT PRIMARY KEY,
      libro_id TEXT NOT NULL,
      fecha TEXT NOT NULL,
      sucursal_id TEXT,
      repuesto INTEGER DEFAULT 0,
      cantidad INTEGER DEFAULT 1,
      precio REAL DEFAULT 0,
      creado_por TEXT,
      observacion TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (libro_id) REFERENCES libros(id),
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    );
  `);

  // Migraciones para tablas existentes
  try { db.exec("ALTER TABLE facturas ADD COLUMN tipo_iva TEXT DEFAULT '10'"); } catch {}
  try { db.exec("ALTER TABLE facturas ADD COLUMN tipo_pago TEXT DEFAULT 'contado'"); } catch {}
  try { db.exec("ALTER TABLE facturas ADD COLUMN cliente_direccion TEXT"); } catch {}
  try { db.exec("ALTER TABLE facturas ADD COLUMN cliente_telefono TEXT"); } catch {}
  try { db.exec("ALTER TABLE facturas ADD COLUMN creado_por TEXT"); } catch {}
  try { db.exec("ALTER TABLE presupuestos ADD COLUMN tipo_iva TEXT DEFAULT '10'"); } catch {}
  try { db.exec("ALTER TABLE empresas ADD COLUMN logo_url TEXT"); } catch {}

  // Migrar roles viejos ('usuario' → 'sucursal') y asignar admin al primero
  try {
    db.prepare("UPDATE usuarios SET rol = 'sucursal' WHERE rol = 'usuario'").run();
    const firstUser = db.prepare("SELECT id FROM usuarios WHERE rol = 'sucursal' ORDER BY created_at ASC LIMIT 1").get();
    if (firstUser) {
      db.prepare("UPDATE usuarios SET rol = 'admin' WHERE id = ?").run(firstUser.id);
    }
  } catch {}

  // Sembrar empresa Copycenter si no existe
  const copycenter = db.prepare("SELECT id FROM empresas WHERE ruc = '0000000-0'").get();
  if (!copycenter) {
    db.prepare("INSERT INTO empresas (id, nombre, ruc, direccion, telefono, email) VALUES (?, ?, ?, ?, ?, ?)").run(
      uuidv4(), 'Copycenter', '0000000-0', '', '', ''
    );
  }
}
