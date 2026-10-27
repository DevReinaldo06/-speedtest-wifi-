const express = require('express');
const { createResultsController } = require('../controllers/results.controller');
const { validateResult, requireClientId } = require('../middlewares/validateResult');

// Rotas do histórico de medições (montadas em /api/results).
function createResultsRouter({ service, config }) {
  const router = express.Router();
  const controller = createResultsController(service);

  router.use(express.json({ limit: '10kb' }));

  router.post('/', validateResult(config), controller.create);
  router.get('/', requireClientId, controller.list);
  // /stats precisa vir antes de /:id para não ser confundida com um id.
  router.get('/stats', requireClientId, controller.stats);
  router.delete('/', requireClientId, controller.clear);
  router.delete('/:id', requireClientId, controller.remove);

  return router;
}

module.exports = { createResultsRouter };
