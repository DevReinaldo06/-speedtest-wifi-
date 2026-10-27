const http = require('http');
const { makeApp, binaryParser } = require('./helpers');

describe('download em streaming', () => {
  test('entrega um arquivo grande inteiro (usa o controle de fluxo)', async () => {
    const { agent, db } = makeApp();
    const size = 8 * 1024 * 1024;
    const res = await agent
      .get(`/api/speedtest/download?size=${size}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(size);
    db.close();
  });

  test('o servidor aguenta o cliente cancelando o download no meio', async () => {
    const { app, db } = makeApp();
    const server = app.listen(0);
    const { port } = server.address();

    await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/api/speedtest/download?size=40000000`, (res) => {
        res.once('data', () => {
          // Cancela depois do primeiro pedaço recebido.
          req.destroy();
        });
        res.on('error', () => {});
        res.on('close', resolve);
      });
      req.on('error', (err) => {
        // ECONNRESET é esperado quando o cliente cancela.
        if (err.code === 'ECONNRESET') {
          resolve();
        } else {
          reject(err);
        }
      });
    });

    // O servidor continua saudável depois do cancelamento.
    const health = await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}/api/health`, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
        })
        .on('error', reject);
    });
    expect(health).toBe(200);

    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
});
