const { makeApp } = require('./helpers');

describe('GET /api/health', () => {
  test('responde 200 com status ok, versão e commit', async () => {
    const { agent, db } = makeApp({ GIT_COMMIT: 'abc123' });
    const res = await agent.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.commit).toBe('abc123');
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.headers['cache-control']).toBe('no-store');
    db.close();
  });

  test('responde 503 quando o banco de dados não está disponível', async () => {
    const { agent, db } = makeApp();
    db.close();

    const res = await agent.get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

describe('rotas gerais', () => {
  test('rota /api inexistente responde 404 em JSON', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Rota não encontrada' });
    db.close();
  });

  test('envia cabeçalhos de segurança e esconde o x-powered-by', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
    db.close();
  });

  test('serve a página inicial estática', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    db.close();
  });

  test('limita requisições por IP e responde 429', async () => {
    const { agent, db } = makeApp({ RATE_LIMIT_MAX: '3', RATE_LIMIT_WINDOW_MS: '60000' });

    for (let i = 0; i < 3; i += 1) {
      const ok = await agent.get('/api/ping');
      expect(ok.status).toBe(204);
    }
    const blocked = await agent.get('/api/ping');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body.error).toMatch(/Muitas requisições/);

    // O health check nunca é limitado.
    const health = await agent.get('/api/health');
    expect(health.status).toBe(200);
    db.close();
  });
});
