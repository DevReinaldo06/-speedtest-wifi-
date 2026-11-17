// Servidor do medidor de velocidade (Node + Express).
const express = require('express');
const path = require('path');
const pacote = require('./package.json');

const app = express();
app.disable('x-powered-by');

// Cabeçalhos de segurança (o DAST/ZAP confere se existem)
app.use((req, res, next) => {
  res.set({
    // connect-src libera só a API pública do GitHub (a aba "Esteira" consulta as execuções)
    'Content-Security-Policy':
      "default-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data:; " +
      "frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  });
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Histórico guardado na memória (zera quando o servidor reinicia)
const historico = [];
const iniciadoEm = new Date().toISOString();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Informações da versão que está no ar. O commit é injetado pela esteira
// (GIT_COMMIT no job dast) ou pelo Render (RENDER_GIT_COMMIT): é a ligação
// entre o sistema e a pipeline.
app.get('/api/info', (req, res) => {
  res.json({
    versao: pacote.version,
    commit: process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || 'local',
    repositorio:
      process.env.GITHUB_REPOSITORY ||
      process.env.RENDER_GIT_REPO_SLUG ||
      'DevReinaldo06/-speedtest-wifi-',
    ambiente: process.env.NODE_ENV || 'desenvolvimento',
    iniciadoEm: iniciadoEm,
  });
});

// Ping: resposta vazia só para medir o tempo de ida e volta
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Download: devolve N megabytes (máximo 50)
app.get('/api/download', (req, res) => {
  const mb = Math.min(Math.max(Number(req.query.mb) || 10, 1), 50);
  res.set('Content-Type', 'application/octet-stream');
  res.send(Buffer.alloc(mb * 1024 * 1024));
});

// Upload: recebe bytes e descarta
app.post('/api/upload', (req, res) => {
  let recebido = 0;
  req.on('data', (parte) => (recebido += parte.length));
  req.on('end', () => res.json({ bytes: recebido }));
});

app.get('/api/historico', (req, res) => res.json(historico));

app.post('/api/historico', (req, res) => {
  const { download, upload, ping } = req.body;
  const valido = [download, upload, ping].every((n) => typeof n === 'number' && n >= 0);
  if (!valido) {
    return res.status(400).json({ erro: 'download, upload e ping devem ser números >= 0' });
  }
  const medicao = { download, upload, ping, data: new Date().toISOString() };
  historico.unshift(medicao);
  res.status(201).json(medicao);
});

app.delete('/api/historico', (req, res) => {
  historico.length = 0;
  res.status(204).end();
});

module.exports = app;

if (require.main === module) {
  const porta = process.env.PORT || 3000;
  app.listen(porta, () => console.log(`Servidor em http://localhost:${porta}`));
}
