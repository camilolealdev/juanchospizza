// Tests del núcleo de base de datos: server/db.js
// Cubre la configuración del Pool (SSL condicional + defaults) y initDB()
// (creación de tablas, delegación a runMigrations y manejo de errores).
// Ejecutar: npx vitest run server/tests/db.test.js
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
// El logger se define acá (estable entre vi.resetModules) porque db.js lee
// process.env al importar y cada caso recarga el módulo con vi.resetModules
// -- si el mock de logger viviera en el factory de vi.mock, cada reset
// crearía una instancia nueva y los asserts contra ella fallarían.
const { mockQuery, poolConfigs, mockRunMigrations, mockLogger } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  poolConfigs: [],
  mockRunMigrations: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor(config) {
        poolConfigs.push(config);
        this.query = mockQuery;
      }
    },
  },
}));

vi.mock('../migrate.js', () => ({
  runMigrations: mockRunMigrations,
}));

vi.mock('../services/logger.js', () => ({
  default: mockLogger,
}));

// db.js lee process.env al momento del import (needsSsl, pool config), así
// que cada caso recarga el módulo con el env que quiere probar.
const DB_ENV_KEYS = [
  'PGSSLMODE',
  'DATABASE_URL',
  'PGSSL_REJECT_UNAUTHORIZED',
  'PG_POOL_MAX',
  'PG_IDLE_TIMEOUT',
  'PG_CONNECT_TIMEOUT',
];

// Snapshot del env al inicio: cada test restaura el original después, para
// que NODE_ENV y otras vars no se filtren entre tests ni a otros archivos.
const originalEnv = { ...process.env };

afterEach(() => {
  Object.keys(process.env).forEach((k) => {
    if (!(k in originalEnv)) delete process.env[k];
  });
  Object.assign(process.env, originalEnv);
});

beforeEach(() => {
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
});

const loadDb = async (env = {}) => {
  DB_ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);
  poolConfigs.length = 0;
  mockQuery.mockReset();
  mockRunMigrations.mockReset();
  vi.resetModules();
  return import('../db.js');
};

describe('Pool — configuración SSL condicional', () => {
  it('usa los defaults (max 20, timeouts estándar, allowExitOnIdle) sin SSL', async () => {
    await loadDb({});
    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0].max).toBe(20);
    expect(poolConfigs[0].idleTimeoutMillis).toBe(30000);
    expect(poolConfigs[0].connectionTimeoutMillis).toBe(5000);
    expect(poolConfigs[0].allowExitOnIdle).toBe(true);
    expect(poolConfigs[0].ssl).toBeUndefined();
  });

  it('activa SSL con PGSSLMODE=require (rejectUnauthorized por defecto)', async () => {
    await loadDb({ PGSSLMODE: 'require' });
    expect(poolConfigs[0].ssl).toEqual({ rejectUnauthorized: true });
  });

  it('activa SSL cuando DATABASE_URL trae sslmode=require', async () => {
    await loadDb({ DATABASE_URL: 'postgres://user:pass@host:5432/db?sslmode=require' });
    expect(poolConfigs[0].ssl).toEqual({ rejectUnauthorized: true });
  });

  it('respeta PGSSL_REJECT_UNAUTHORIZED=false', async () => {
    await loadDb({ PGSSLMODE: 'require', PGSSL_REJECT_UNAUTHORIZED: 'false' });
    expect(poolConfigs[0].ssl).toEqual({ rejectUnauthorized: false });
  });

  it('no activa SSL por NODE_ENV=production sin var explícita', async () => {
    await loadDb({ NODE_ENV: 'production' });
    expect(poolConfigs[0].ssl).toBeUndefined();
  });
});

describe('initDB()', () => {
  it('crea las tablas base y delega en runMigrations con el pool', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { pool, initDB } = await loadDb({});

    await initDB();

    expect(mockQuery).toHaveBeenCalled();
    const sqls = mockQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS categories'))).toBe(true);
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS clients'))).toBe(true);
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS processed_webhooks'))).toBe(true);
    expect(mockRunMigrations).toHaveBeenCalledTimes(1);
    expect(mockRunMigrations).toHaveBeenCalledWith(pool);
  });

  it('si una query falla, loguea el error y NO lanza (initDB nunca rompe el boot)', async () => {
    // loadDb() resetea mockQuery: configurar el rechazo DESPUÉS de cargar.
    const { initDB } = await loadDb({});
    mockQuery.mockRejectedValue(new Error('connection refused'));

    await expect(initDB()).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockRunMigrations).not.toHaveBeenCalled();
  });
});

describe('schema.sql — sync con initDB() (prevención de drift de deploy)', () => {
  // Un deploy fresco bootstrapea Postgres con docker/postgres/schema.sql (vía
  // docker-entrypoint-initdb.d). Si ese archivo se atrasa respecto a
  // server/db.js initDB(), el deploy pierde tablas silenciosamente — pasó con
  // processed_webhooks (idempotencia de webhooks de pago) y se detectó solo
  // por auditoría. Este test hace que ese drift sea imposible de ignorar.
  it('schema.sql contiene EXACTAMENTE las mismas tablas que initDB()', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // import.meta.url no es un file:// URL bajo el runner de vitest de este
    // proyecto; vitest corre con cwd = raíz del proyecto, así que process.cwd()
    // es la base correcta.
    const root = process.cwd();
    const dbSource = readFileSync(join(root, 'server/db.js'), 'utf-8');
    const schemaSql = readFileSync(join(root, 'docker/postgres/schema.sql'), 'utf-8');

    const tableNames = (sql) => [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)].map((m) => m[1]);

    const dbTables = new Set(tableNames(dbSource));
    const schemaTables = new Set(tableNames(schemaSql));
    const missing = [...dbTables].filter((t) => !schemaTables.has(t));
    const extra = [...schemaTables].filter((t) => !dbTables.has(t));

    // Mensajes explícitos para que el fallo diga qué tabla driftó
    expect(missing, `Faltan en schema.sql: ${missing.join(', ')}`).toEqual([]);
    expect(extra, `Solo en schema.sql (fuera de initDB): ${extra.join(', ')}`).toEqual([]);
    // El caso que motivó el test: la idempotencia de webhooks de pago
    expect(schemaTables.has('processed_webhooks')).toBe(true);
  });
});
