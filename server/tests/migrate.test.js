// Tests del sistema de migraciones versionadas: server/migrate.js
// Cubre el runner: tabla de tracking, ejecución en orden con transacción
// por migración (client dedicado), skip de aplicadas, detección de hash
// change y rollback en fallo. MIGRATIONS no se exporta, así que los hashes
// esperados se capturan de una corrida inicial (son determinísticos).
// Ejecutar: npx vitest run server/tests/migrate.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));

import logger from '../services/logger.js';
import { runMigrations } from '../migrate.js';

// Pool fake: query() responde la tabla de tracking y el SELECT de aplicadas;
// connect() devuelve un client fake cuyo query() resuelve siempre (o lanza
// si el SQL incluye failOnSql).
function makePool({ applied = [], failOnSql = null } = {}) {
  const client = {
    query: vi.fn(async (sql) => {
      if (failOnSql && String(sql).includes(failOnSql)) throw new Error('boom');
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn(async (sql) => {
      const s = String(sql);
      if (s.includes('CREATE TABLE IF NOT EXISTS "_schema_migrations"')) return { rows: [] };
      if (s.includes('SELECT id, hash FROM "_schema_migrations"')) return { rows: applied };
      return { rows: [] };
    }),
    connect: vi.fn().mockResolvedValue(client),
  };
  return { pool, client };
}

// Extrae los registros {id, hash} que el runner insertó en la tabla de
// tracking durante una corrida (los usa la siguiente corrida como "aplicadas").
function appliedRecords(client) {
  return client.query.mock.calls
    .filter(([sql]) => String(sql).includes('INSERT INTO "_schema_migrations"'))
    .map(([, params]) => ({ id: params[0], hash: params[2] }));
}

const migrationInsertIds = (client) =>
  client.query.mock.calls
    .filter(([sql]) => String(sql).includes('INSERT INTO "_schema_migrations"'))
    .map(([, params]) => params[0]);

describe('runMigrations()', () => {
  it('crea la tabla de tracking y aplica TODAS las pendientes en orden, una transacción por migración', async () => {
    const { pool, client } = makePool();

    await runMigrations(pool);

    // Tracking table primero
    expect(String(pool.query.mock.calls[0][0])).toContain('CREATE TABLE IF NOT EXISTS "_schema_migrations"');

    // Cada migración: connect() dedicado + BEGIN + up + INSERT registro + COMMIT
    const n = migrationInsertIds(client).length;
    expect(n).toBeGreaterThan(0);
    expect(pool.connect).toHaveBeenCalledTimes(n);
    expect(client.query.mock.calls.filter(([sql]) => String(sql) === 'BEGIN')).toHaveLength(n);
    expect(client.query.mock.calls.filter(([sql]) => String(sql) === 'COMMIT')).toHaveLength(n);
    expect(client.release).toHaveBeenCalledTimes(n);
    // IDs en orden ascendente 1..n
    expect(migrationInsertIds(client)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ pending: n }),
      expect.stringContaining('migración')
    );
  });

  it('con todas las migraciones ya aplicadas (mismo hash) no corre ninguna', async () => {
    const first = makePool();
    await runMigrations(first.pool);
    const applied = appliedRecords(first.client);

    const second = makePool({ applied });
    logger.info.mockClear();
    await runMigrations(second.pool);

    expect(second.pool.connect).not.toHaveBeenCalled();
    expect(second.client.query).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('No hay migraciones pendientes');
  });

  it('detecta cambios de hash en migraciones ya aplicadas, avisa y las ignora', async () => {
    const first = makePool();
    await runMigrations(first.pool);
    const applied = appliedRecords(first.client).map((r) => ({ ...r, hash: 'hash_cambiado_000' }));

    const second = makePool({ applied });
    logger.warn.mockClear();
    await runMigrations(second.pool);

    expect(second.pool.connect).not.toHaveBeenCalled();
    expect(logger.warn.mock.calls.length).toBe(applied.length);
    // Avisa con el id y nombre de la migración modificada
    expect(logger.warn.mock.calls[0][1]).toContain('cambió desde que se aplicó');
  });

  it('aplica solo las pendientes cuando hay un subconjunto ya aplicado', async () => {
    const first = makePool();
    await runMigrations(first.pool);
    const all = appliedRecords(first.client);
    const applied = all.slice(0, 2);

    const second = makePool({ applied });
    await runMigrations(second.pool);

    const pendingIds = migrationInsertIds(second.client);
    expect(pendingIds).toEqual(all.slice(2).map((r) => r.id));
    expect(second.pool.connect).toHaveBeenCalledTimes(pendingIds.length);
  });

  it('si una migración falla: ROLLBACK, loguea el error y RE-LANZA (no traga el fallo)', async () => {
    // La migración #1 hace INSERT INTO employees... -> forzar fallo ahí
    const { pool, client } = makePool({ failOnSql: 'INSERT INTO employees' });

    await expect(runMigrations(pool)).rejects.toThrow('boom');

    const rollbacks = client.query.mock.calls.filter(([sql]) => String(sql) === 'ROLLBACK');
    expect(rollbacks).toHaveLength(1);
    expect(client.release).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
