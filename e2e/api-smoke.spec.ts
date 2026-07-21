import { test, expect } from '@playwright/test';

test.describe('API Smoke Tests', () => {

  test('GET /api/health returns healthy status', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('services');
    expect(body.services).toHaveProperty('database');
    expect(body.services).toHaveProperty('redis');
  });

  test('GET /api/metrics returns prometheus format', async ({ request }) => {
    const resp = await request.get('/api/metrics');
    expect(resp.ok()).toBeTruthy();
    const text = await resp.text();
    expect(text).toContain('http_requests_total');
    expect(text).toContain('http_request_duration_ms');
  });

  test('GET /api/digiturno/queue returns array', async ({ request }) => {
    const resp = await request.get('/api/digiturno/queue');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('OPTIONS /api/auth/login has CORS headers', async ({ request }) => {
    const resp = await request.fetch('/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(resp.headers()['access-control-allow-origin']).toBeTruthy();
  });

  test('POST /api/auth/login without body returns 401', async ({ request }) => {
    const resp = await request.post('/api/auth/login', {
      data: {},
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toHaveProperty('error');
  });

});
