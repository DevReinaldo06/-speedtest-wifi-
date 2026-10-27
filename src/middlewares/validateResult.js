const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

// Número finito, dentro de [0, max].
function isNumberInRange(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Valida o corpo de POST /api/results.
// Devolve { valid, errors, value }; `value` só existe quando é válido e
// contém apenas os campos conhecidos (campos extras são ignorados).
function validateResultPayload(body, limits = {}) {
  const { maxMbps = 10000, maxMs = 60000 } = limits;
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['O corpo da requisição deve ser um objeto JSON'] };
  }

  if (!isUuid(body.clientId)) {
    errors.push('clientId deve ser um UUID válido');
  }
  if (!isNumberInRange(body.downloadMbps, maxMbps)) {
    errors.push(`downloadMbps deve ser um número entre 0 e ${maxMbps}`);
  }
  if (!isNumberInRange(body.uploadMbps, maxMbps)) {
    errors.push(`uploadMbps deve ser um número entre 0 e ${maxMbps}`);
  }
  if (!isNumberInRange(body.pingMs, maxMs)) {
    errors.push(`pingMs deve ser um número entre 0 e ${maxMs}`);
  }

  const hasJitter = body.jitterMs !== undefined && body.jitterMs !== null;
  if (hasJitter && !isNumberInRange(body.jitterMs, maxMs)) {
    errors.push(`jitterMs deve ser um número entre 0 e ${maxMs}`);
  }

  let connectionType = null;
  if (body.connectionType !== undefined && body.connectionType !== null) {
    if (typeof body.connectionType !== 'string' || body.connectionType.trim().length > 30) {
      errors.push('connectionType deve ser um texto de até 30 caracteres');
    } else {
      connectionType = body.connectionType.trim() || null;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    value: {
      clientId: body.clientId.toLowerCase(),
      downloadMbps: round2(body.downloadMbps),
      uploadMbps: round2(body.uploadMbps),
      pingMs: round2(body.pingMs),
      jitterMs: hasJitter ? round2(body.jitterMs) : null,
      connectionType,
    },
  };
}

// Middleware: valida o corpo e deixa o resultado limpo em req.validated.
function validateResult(limits) {
  return (req, res, next) => {
    const result = validateResultPayload(req.body, limits);
    if (!result.valid) {
      return res.status(400).json({ error: result.errors.join('; ') });
    }
    req.validated = result.value;
    return next();
  };
}

// Middleware: exige ?clientId=<uuid> na URL e o normaliza em req.clientId.
function requireClientId(req, res, next) {
  const { clientId } = req.query;
  if (!isUuid(clientId)) {
    return res.status(400).json({ error: 'clientId deve ser um UUID válido' });
  }
  req.clientId = clientId.toLowerCase();
  return next();
}

module.exports = { isUuid, validateResultPayload, validateResult, requireClientId };
