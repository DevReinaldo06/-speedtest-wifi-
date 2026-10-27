const path = require('path');
const express = require('express');
const { loadConfig } = require('./config');
const { createDatabase } = require('./db/database');
const { createResultsService } = require('./services/results.service');
const { createHealthRouter } = require('./routes/health.routes');
const { createSpeedtestRouter } = require('./routes/speedtest.routes');
const { createResultsRouter } = require('./routes/results.routes');
const { createRateLimiter } = require('./middlewares/rateLimit');
const { apiNotFound, errorHandler } = require('./middlewares/errorHandler');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
}

// Monta o Express sem abrir porta: o server.js sobe o servidor e os testes
// (Supertest) usam este app diretamente.
// `config` e `db` podem ser injetados (testes); sem eles, usa os padrões.
function createApp({ config = loadConfig(), db } = {}) {
  const database = db || createDatabase(config.dbPath);
  const resultsService = createResultsService(database);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás do proxy do Render/Docker, req.ip é o do cliente
  app.locals.db = database;
  app.locals.config = config;

  app.use(securityHeaders);

  // /api/health fica antes do limitador para nunca ser bloqueado.
  app.use('/api', createHealthRouter({ db: database, config }));
  app.use(
    '/api',
    createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }),
  );
  app.use('/api', createSpeedtestRouter({ config }));
  app.use('/api/results', createResultsRouter({ service: resultsService, config }));
  app.use('/api', apiNotFound);

  app.use(express.static(PUBLIC_DIR));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
