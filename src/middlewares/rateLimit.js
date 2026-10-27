// Limite simples de requisições por IP, em memória.
// Suficiente para este projeto; em produção com várias instâncias
// o ideal seria um armazenamento compartilhado (ex.: Redis).
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip || 'desconhecido';

    // Limpeza preguiçosa para o mapa não crescer sem parar.
    if (hits.size > 10000) {
      for (const [ip, entry] of hits) {
        if (entry.resetAt <= now) {
          hits.delete(ip);
        }
      }
    }

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
    }
    return next();
  };
}

module.exports = { createRateLimiter };
