import { Worker } from 'bullmq';
import { redis } from '../redis.js';
import { pool } from '../db.js';

const reportQueries = {
  sales: `
    SELECT
      DATE_TRUNC('day', "createdAt") as day,
      COUNT(*) as orders,
      SUM(total) as revenue,
      AVG(total) as avg_ticket
    FROM orders
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
    GROUP BY day
    ORDER BY day
  `,
  topProducts: `
    SELECT
      p.nombre,
      SUM((item->>'qty')::int) as qty,
      SUM((item->>'price')::int * (item->>'qty')::int) as revenue
    FROM orders, jsonb_array_elements(items) as item
    JOIN products p ON p.id = item->>'productId'
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
    GROUP BY p.nombre
    ORDER BY qty DESC
    LIMIT 20
  `,
  categorySales: `
    SELECT
      c.name as category,
      COUNT(*) as orders,
      SUM(total) as revenue
    FROM orders o
    JOIN jsonb_array_elements(o.items) item ON true
    JOIN products p ON p.id = item->>'productId'
    JOIN categories c ON c.id = p."categoryId"
    WHERE o."createdAt" >= $1 AND o."createdAt" <= $2
    GROUP BY c.name
    ORDER BY revenue DESC
  `,
  hourlyDistribution: `
    SELECT
      EXTRACT(HOUR FROM "createdAt") as hour,
      COUNT(*) as orders,
      SUM(total) as revenue
    FROM orders
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
    GROUP BY hour
    ORDER BY hour
  `,
  customerStats: `
    SELECT
      COUNT(*) as total_customers,
      COUNT(*) FILTER (WHERE "totalCompras" > 0) as active_customers,
      AVG("totalGastado") as avg_ltv,
      SUM("totalGastado") as total_revenue
    FROM clients
    WHERE estado = 'activo'
  `,
};

export const reportsWorker = new Worker(
  'reports',
  async (job) => {
    const { type, startDate, endDate, format = 'json' } = job.data;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    if (!reportQueries[type]) {
      throw new Error(`Tipo de reporte no soportado: ${type}`);
    }

    const result = await pool.query(reportQueries[type], [start, end]);

    let output;
    if (format === 'csv') {
      const headers = result.fields.map((f) => f.name).join(',');
      const rows = result.rows.map((r) => Object.values(r).join(',')).join('\n');
      output = `${headers}\n${rows}`;
    } else {
      output = JSON.stringify(result.rows, null, 2);
    }

    const reportId = `rpt-${type}-${Date.now()}`;
    return { reportId, type, rows: result.rowCount, format, data: output };
  },
  { connection: redis, concurrency: 2 }
);

reportsWorker.on('completed', (job) => console.log(`[Reports] Job ${job.id} generated`));
reportsWorker.on('failed', (job, err) => console.error(`[Reports] Job ${job?.id} failed:`, err.message));

console.log('[Worker] Reports worker started');
