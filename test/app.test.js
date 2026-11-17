const request = require('supertest');
const app = require('../server');

test('health responde ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});

test('info devolve versão e commit da esteira', async () => {
  const res = await request(app).get('/api/info');
  expect(res.status).toBe(200);
  expect(res.body.versao).toMatch(/^\d+\.\d+\.\d+$/);
  expect(res.body.commit).toBeDefined();
  expect(res.body.repositorio).toContain('/');
});

test('download devolve o tamanho pedido', async () => {
  const res = await request(app).get('/api/download?mb=1').buffer(true);
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(1024 * 1024);
});

test('upload conta os bytes recebidos', async () => {
  const res = await request(app)
    .post('/api/upload')
    .set('Content-Type', 'application/octet-stream')
    .send(Buffer.alloc(2048));
  expect(res.body.bytes).toBe(2048);
});

test('salva e lista medições no histórico', async () => {
  const novo = await request(app).post('/api/historico').send({ download: 50, upload: 20, ping: 12 });
  expect(novo.status).toBe(201);
  const lista = await request(app).get('/api/historico');
  expect(lista.body[0].download).toBe(50);
});

test('rejeita medição inválida', async () => {
  const res = await request(app).post('/api/historico').send({ download: 'abc', upload: 1, ping: 1 });
  expect(res.status).toBe(400);
});

test('limpa o histórico', async () => {
  await request(app).post('/api/historico').send({ download: 10, upload: 5, ping: 20 });
  const apagado = await request(app).delete('/api/historico');
  expect(apagado.status).toBe(204);
  const lista = await request(app).get('/api/historico');
  expect(lista.body).toEqual([]);
});

test('envia cabeçalhos de segurança', async () => {
  const res = await request(app).get('/');
  expect(res.headers['content-security-policy']).toBeDefined();
  expect(res.headers['x-powered-by']).toBeUndefined();
});
