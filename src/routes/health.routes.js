const express = require('express');

// GET /api/health: confirma que o servidor e o banco estão respondendo.
// Usado pela pipeline, pelo Docker (HEALTHCHECK) e pelo deploy.
function createHealthRouter({ db, config }) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      db.prepare('SELECT 1').get();
      res.json({
        status: 'ok',
        version: config.version,
        commit: config.commit,
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch {
      res.status(503).json({ status: 'error', error: 'Banco de dados indisponível' });
    }
  });

  return router;
}

module.exports = { createHealthRouter };
