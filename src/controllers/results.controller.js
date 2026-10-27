// Lê um inteiro positivo opcional da URL (ex.: ?page=2).
// Devolve o padrão se não veio, ou null se veio inválido.
function parseQueryInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

function createResultsController(service) {
  return {
    create(req, res) {
      const result = service.create(req.validated, req.get('user-agent'));
      res.status(201).json(result);
    },

    list(req, res) {
      const page = parseQueryInt(req.query.page, 1);
      const limit = parseQueryInt(req.query.limit, 10, 100);
      if (page === null || limit === null) {
        return res
          .status(400)
          .json({ error: 'page deve ser um inteiro maior que 0 e limit deve estar entre 1 e 100' });
      }
      return res.json(service.list(req.clientId, { page, limit }));
    },

    stats(req, res) {
      res.json(service.stats(req.clientId));
    },

    remove(req, res) {
      if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: 'id deve ser um número inteiro' });
      }
      const removed = service.remove(req.clientId, Number(req.params.id));
      if (!removed) {
        return res.status(404).json({ error: 'Medição não encontrada' });
      }
      return res.status(204).end();
    },

    clear(req, res) {
      service.clear(req.clientId);
      res.status(204).end();
    },
  };
}

module.exports = { createResultsController, parseQueryInt };
