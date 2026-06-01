import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;
let pool;

function param(sql, params) {
  let idx = 0;
  const text = sql.replace(/\?/g, () => `$${++idx}`);
  return { text, values: params };
}

export async function run(sql, ...params) {
  const { text, values } = param(sql, params);
  return pool.query(text, values);
}

export async function get(sql, ...params) {
  const { text, values } = param(sql, params);
  const result = await pool.query(text, values);
  return result.rows[0] || null;
}

export async function all(sql, ...params) {
  const { text, values } = param(sql, params);
  const result = await pool.query(text, values);
  return result.rows;
}

export async function raw(sql, params) {
  return pool.query(sql, params);
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      run: async (sql, ...params) => {
        const { text, values } = param(sql, params);
        return client.query(text, values);
      },
      get: async (sql, ...params) => {
        const { text, values } = param(sql, params);
        const r = await client.query(text, values);
        return r.rows[0] || null;
      },
      all: async (sql, ...params) => {
        const { text, values } = param(sql, params);
        const r = await client.query(text, values);
        return r.rows;
      }
    });
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/copycenter';
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await pool.query('SELECT 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sucursales (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'usuario',
      sucursal_id TEXT REFERENCES sucursales(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      ruc TEXT UNIQUE NOT NULL,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      logo TEXT,
      logo_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS facturas (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
      numero_factura TEXT NOT NULL,
      fecha DATE NOT NULL,
      monto DOUBLE PRECISION NOT NULL,
      tipo_iva TEXT DEFAULT '10' CHECK(tipo_iva IN ('exonerado', '5', '10')),
      tipo_pago TEXT DEFAULT 'contado' CHECK(tipo_pago IN ('contado', 'credito')),
      ruc TEXT,
      nombre_cliente TEXT,
      cliente_direccion TEXT,
      cliente_telefono TEXT,
      empresa_id TEXT REFERENCES empresas(id),
      sucursal_id TEXT REFERENCES sucursales(id),
      file_path TEXT,
      creado_por TEXT,
      observacion TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS presupuestos (
      id TEXT PRIMARY KEY,
      numero TEXT UNIQUE NOT NULL,
      fecha DATE NOT NULL,
      cliente_nombre TEXT NOT NULL,
      cliente_ruc TEXT,
      cliente_direccion TEXT,
      cliente_email TEXT,
      notas TEXT,
      subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
      iva DOUBLE PRECISION NOT NULL DEFAULT 0,
      tipo_iva TEXT DEFAULT '10' CHECK(tipo_iva IN ('exonerado', '5', '10')),
      total DOUBLE PRECISION NOT NULL DEFAULT 0,
      empresa_id TEXT REFERENCES empresas(id),
      sucursal_id TEXT REFERENCES sucursales(id),
      estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador','enviado','aceptado','rechazado')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS presupuesto_items (
      id TEXT PRIMARY KEY,
      presupuesto_id TEXT NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
      descripcion TEXT NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_unitario DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      tabla TEXT NOT NULL,
      accion TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      sucursal_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS libros (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT,
      editorial TEXT,
      isbn TEXT,
      precio DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ventas_libros (
      id TEXT PRIMARY KEY,
      libro_id TEXT NOT NULL REFERENCES libros(id),
      fecha DATE NOT NULL,
      sucursal_id TEXT REFERENCES sucursales(id),
      repuesto INTEGER DEFAULT 0,
      cantidad INTEGER DEFAULT 1,
      precio DOUBLE PRECISION DEFAULT 0,
      creado_por TEXT,
      observacion TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrar roles viejos y asegurar que haya al menos un admin
  await pool.query("UPDATE usuarios SET rol = 'sucursal' WHERE rol = 'usuario'");
  const adminExists = await get("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1");
  if (!adminExists) {
    const firstUser = await get("SELECT id FROM usuarios ORDER BY created_at ASC LIMIT 1");
    if (firstUser) {
      await run("UPDATE usuarios SET rol = 'admin' WHERE id = ?", firstUser.id);
      console.log('Primer usuario promovido a admin');
    }
  }

  // Sembrar empresa Copycenter si no existe
  const copycenter = await get("SELECT id FROM empresas WHERE ruc = '0000000-0'");
  if (!copycenter) {
    await run("INSERT INTO empresas (id, nombre, ruc, direccion, telefono, email) VALUES (?, ?, ?, ?, ?, ?)",
      uuidv4(), 'Copycenter', '0000000-0', '', '', '');
  }

  // Migraciones para columnas nuevas
  try { await pool.query("ALTER TABLE ventas_libros ADD COLUMN formato TEXT DEFAULT 'formato_libro'"); } catch {}
  try { await pool.query("ALTER TABLE ventas_libros ADD COLUMN color TEXT DEFAULT 'blanco_negro'"); } catch {}
  try { await pool.query("ALTER TABLE libros ADD COLUMN formato TEXT DEFAULT 'formato_libro'"); } catch {}
  try { await pool.query("ALTER TABLE libros ADD COLUMN color TEXT DEFAULT 'blanco_negro'"); } catch {}
  try { await pool.query("ALTER TABLE libros ADD COLUMN precio DOUBLE PRECISION DEFAULT 0"); } catch {}

  // Auditoria
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        usuario_id TEXT,
        usuario_nombre TEXT,
        tabla TEXT NOT NULL,
        accion TEXT NOT NULL,
        registro_id TEXT,
        detalles TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch {}

  console.log('Base de datos PostgreSQL inicializada');
}

export async function logAction(usuarioId, usuarioNombre, tabla, accion, registroId, detalles) {
  try {
    const { v4: uuidv4 } = await import('uuid');
    await run("INSERT INTO audit_log (id, usuario_id, usuario_nombre, tabla, accion, registro_id, detalles) VALUES (?, ?, ?, ?, ?, ?, ?)",
      uuidv4(), usuarioId, usuarioNombre, tabla, accion, registroId, detalles ? JSON.stringify(detalles) : null);
  } catch (e) {
    console.error('Error logging audit:', e.message);
  }
}
}
