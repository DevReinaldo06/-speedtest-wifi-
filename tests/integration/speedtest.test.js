const { makeApp, binaryParser } = require('./helpers');

describe('GET /api/ping', () => {
  test('responde 204 sem corpo e sem cache', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/ping');

    expect(res.status).toBe(204);
    expect(res.text).toBeFalsy();
    expect(res.headers['cache-control']).toBe('no-store');
    db.close();
  });
});

describe('GET /api/config', () => {
  test('informa modo rápido e limites', async () => {
    const { agent, db } = makeApp({ SPEEDTEST_FAST: '1', MAX_DOWNLOAD_MB: '10', MAX_UPLOAD_MB: '5' });
    const res = await agent.get('/api/config');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      fastMode: true,
      maxDownloadBytes: 10 * 1024 * 1024,
      maxUploadBytes: 5 * 1024 * 1024,
    });
    db.close();
  });
});

describe('GET /api/speedtest/download', () => {
  test('envia exatamente o número de bytes pedido', async () => {
    const { agent, db } = makeApp();
    const res = await agent
      .get('/api/speedtest/download?size=300000')
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(Number(res.headers['content-length'])).toBe(300000);
    expect(res.body.length).toBe(300000);
    db.close();
  });

  test('os bytes enviados não são todos iguais (dados aleatórios)', async () => {
    const { agent, db } = makeApp();
    const res = await agent
      .get('/api/speedtest/download?size=4096')
      .buffer(true)
      .parse(binaryParser);

    expect(new Set(res.body).size).toBeGreaterThan(50);
    db.close();
  });

  test('sem ?size usa 1 MB', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/speedtest/download').buffer(true).parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1024 * 1024);
    db.close();
  });

  test('recusa size acima do limite com 400', async () => {
    const { agent, db } = makeApp({ MAX_DOWNLOAD_MB: '1' });
    const res = await agent.get(`/api/speedtest/download?size=${1024 * 1024 + 1}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/size/);
    db.close();
  });

  test.each([['0'], ['-5'], ['abc'], ['1.5'], ['1e6'], ['']])(
    'recusa size inválido (%p) com 400',
    async (size) => {
      const { agent, db } = makeApp();
      const res = await agent.get(`/api/speedtest/download?size=${size}`);

      expect(res.status).toBe(400);
      db.close();
    },
  );

  test('recusa size repetido na URL com 400', async () => {
    const { agent, db } = makeApp();
    const res = await agent.get('/api/speedtest/download?size=10&size=20');

    expect(res.status).toBe(400);
    db.close();
  });
});

describe('POST /api/speedtest/upload', () => {
  test('informa quantos bytes recebeu', async () => {
    const { agent, db } = makeApp();
    const body = Buffer.alloc(150000, 7);
    const res = await agent
      .post('/api/speedtest/upload')
      .set('Content-Type', 'application/octet-stream')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ receivedBytes: 150000 });
    db.close();
  });

  test('corpo vazio resulta em 0 bytes', async () => {
    const { agent, db } = makeApp();
    const res = await agent.post('/api/speedtest/upload');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ receivedBytes: 0 });
    db.close();
  });

  test('recusa corpo acima do limite com 413', async () => {
    const { agent, db } = makeApp({ MAX_UPLOAD_MB: '1' });
    const res = await agent
      .post('/api/speedtest/upload')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(1024 * 1024 + 10, 1));

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/limite/);
    db.close();
  });
});
