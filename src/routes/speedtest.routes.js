const express = require('express');
const { createSpeedtestController } = require('../controllers/speedtest.controller');

// Rotas usadas pelo navegador para medir ping, download e upload.
function createSpeedtestRouter({ config }) {
  const router = express.Router();
  const controller = createSpeedtestController(config);

  router.get('/config', controller.settings);
  router.get('/ping', controller.ping);
  router.get('/speedtest/download', controller.download);
  router.post(
    '/speedtest/upload',
    express.raw({ type: () => true, limit: config.maxUploadBytes }),
    controller.upload,
  );

  return router;
}

module.exports = { createSpeedtestRouter };
