const { makeApp, validResult, CLIENT_A, CLIENT_B } = require('./helpers');

describe('POST /api/results', () => {
  test('salva uma medição válida e responde 201 com o registro', async () => {
    const { agent, db } = makeApp();
    const res = await agent
      .post('/api/results')
      .set('User-Agent', 'jest-test')
      .send(validResult());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      clientId: CLIENT_A,
      downloadMbps: 87.4,
      uploadMbps: 23.1,
      pingMs: 18.6,
      jitterMs: 3.2,
      connectionType: 'wifi',
    });
    expect(res.body.id).toBeGreaterThan(0);
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const stored = db.prepare('SELECT user_agent FROM results WHERE id = ?').get(res.body.id);
    expect(stored.user_agent).toBe('jest-test');
    db.close();
  });

  test('a medição salva aparece no histórico', async () => {
    const { agent, db } = makeApp();
    await agent.post('/api/results').send(validResult());

    const res = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].downloadMbps).toBe(87.4);
    db.close();
  });

  test.each([
    ['downloadMbps negativo', { downloadMbps: -1 }],
    ['uploadMbps acima do teto', { uploadMbps: 99999 }],
    ['pingMs em texto', { pingMs: 'rápido' }],
    ['clientId inválido', { clientId: 'nao-e-uuid' }],
  ])('recusa resultado inválido: %s', async (_nome, overrides) => {
    const { agent, db } = makeApp();
    const res = await agent.post('/api/results').send(validResult(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    db.close();
  });

  test('recusa JSON malformado com 400', async () => {
    const { agent, db } = makeApp();
    const res = await agent
      .post('/api/results')
      .set('Content-Type', 'application/json')
      .send('{"clientId": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido');
    db.close();
  });

  test('recusa corpo vazio com 400', async () => {
    const { agent, db } = makeApp();
    const res = await agent.post('/api/results');

    expect(res.status).toBe(400);
    db.close();
  });

  test('recusa corpo grande demais com 413', async () => {
    const { agent, db } = makeApp();
    const res = await agent
      .post('/api/results')
      .send(validResult({ connectionType: 'x'.repeat(20000) }));

    expect(res.status).toBe(413);
    db.close();
  });
});

describe('GET /api/results', () => {
  test('exige clientId válido', async () => {
    const { agent, db } = makeApp();

    expect((await agent.get('/api/results')).status).toBe(400);
    expect((await agent.get('/api/results?clientId=abc')).status).toBe(400);
    db.close();
  });

  test('histórico de um clientId não mostra o de outro', async () => {
    const { agent, db } = makeApp();
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_A }));
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_A }));
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_B, downloadMbps: 5 }));

    const a = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    const b = await agent.get(`/api/results?clientId=${CLIENT_B}`);

    expect(a.body.total).toBe(2);
    expect(b.body.total).toBe(1);
    expect(b.body.items[0].downloadMbps).toBe(5);
    db.close();
  });

  test('lista as medições mais recentes primeiro', async () => {
    const { agent, db } = makeApp();
    await agent.post('/api/results').send(validResult({ downloadMbps: 10 }));
    await agent.post('/api/results').send(validResult({ downloadMbps: 20 }));
    await agent.post('/api/results').send(validResult({ downloadMbps: 30 }));

    const res = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    expect(res.body.items.map((item) => item.downloadMbps)).toEqual([30, 20, 10]);
    db.close();
  });

  test('pagina o resultado com page e limit', async () => {
    const { agent, db } = makeApp();
    for (let i = 1; i <= 5; i += 1) {
      await agent.post('/api/results').send(validResult({ downloadMbps: i * 10 }));
    }

    const page1 = await agent.get(`/api/results?clientId=${CLIENT_A}&page=1&limit=2`);
    const page3 = await agent.get(`/api/results?clientId=${CLIENT_A}&page=3&limit=2`);

    expect(page1.body.total).toBe(5);
    expect(page1.body.items.map((item) => item.downloadMbps)).toEqual([50, 40]);
    expect(page3.body.items.map((item) => item.downloadMbps)).toEqual([10]);
    db.close();
  });

  test.each([['page=0'], ['page=abc'], ['limit=0'], ['limit=101'], ['limit=-1']])(
    'recusa paginação inválida (%s) com 400',
    async (query) => {
      const { agent, db } = makeApp();
      const res = await agent.get(`/api/results?clientId=${CLIENT_A}&${query}`);

      expect(res.status).toBe(400);
      db.close();
    },
  );

  test('histórico vazio devolve lista vazia', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get(`/api/results?clientId=${CLIENT_A}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0, page: 1, limit: 10 });
    db.close();
  });
});

describe('GET /api/results/stats', () => {
  test('calcula média, máximo, mínimo e total', async () => {
    const { agent, db } = makeApp();
    await agent.post('/api/results').send(validResult({ downloadMbps: 10, uploadMbps: 4, pingMs: 30 }));
    await agent.post('/api/results').send(validResult({ downloadMbps: 30, uploadMbps: 8, pingMs: 10 }));

    const res = await agent.get(`/api/results/stats?clientId=${CLIENT_A}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: 2,
      avgDownloadMbps: 20,
      maxDownloadMbps: 30,
      minDownloadMbps: 10,
      avgUploadMbps: 6,
      maxUploadMbps: 8,
      minUploadMbps: 4,
      avgPingMs: 20,
      minPingMs: 10,
    });
    db.close();
  });

  test('sem medições devolve total 0 e valores nulos', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get(`/api/results/stats?clientId=${CLIENT_A}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.avgDownloadMbps).toBeNull();
    db.close();
  });

  test('exige clientId válido', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/results/stats');

    expect(res.status).toBe(400);
    db.close();
  });
});

describe('DELETE /api/results', () => {
  test('apaga uma medição e responde 204', async () => {
    const { agent, db } = makeApp();
    const created = await agent.post('/api/results').send(validResult());

    const del = await agent.delete(`/api/results/${created.body.id}?clientId=${CLIENT_A}`);
    expect(del.status).toBe(204);

    const list = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    expect(list.body.total).toBe(0);
    db.close();
  });

  test('apagar um id inexistente responde 404', async () => {
    const { agent, db } = makeApp();
    const res = await agent.delete(`/api/results/9999?clientId=${CLIENT_A}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrada/);
    db.close();
  });

  test('não apaga a medição de outro cliente', async () => {
    const { agent, db } = makeApp();
    const created = await agent.post('/api/results').send(validResult({ clientId: CLIENT_A }));

    const del = await agent.delete(`/api/results/${created.body.id}?clientId=${CLIENT_B}`);
    expect(del.status).toBe(404);

    const list = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    expect(list.body.total).toBe(1);
    db.close();
  });

  test('id que não é número responde 400', async () => {
    const { agent, db } = makeApp();
    const res = await agent.delete(`/api/results/abc?clientId=${CLIENT_A}`);

    expect(res.status).toBe(400);
    db.close();
  });

  test('exige clientId ao apagar', async () => {
    const { agent, db } = makeApp();
    const res = await agent.delete('/api/results/1');

    expect(res.status).toBe(400);
    db.close();
  });

  test('limpa só o histórico do cliente informado', async () => {
    const { agent, db } = makeApp();
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_A }));
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_A }));
    await agent.post('/api/results').send(validResult({ clientId: CLIENT_B }));

    const del = await agent.delete(`/api/results?clientId=${CLIENT_A}`);
    expect(del.status).toBe(204);

    const a = await agent.get(`/api/results?clientId=${CLIENT_A}`);
    const b = await agent.get(`/api/results?clientId=${CLIENT_B}`);
    expect(a.body.total).toBe(0);
    expect(b.body.total).toBe(1);
    db.close();
  });
});
