const {
  isUuid,
  validateResultPayload,
  validateResult,
  requireClientId,
} = require('../../src/middlewares/validateResult');

const UUID = '7b1f0c2e-9a4d-4e1b-8f55-2d3c6a7e9b10';

function payload(overrides = {}) {
  return {
    clientId: UUID,
    downloadMbps: 87.4,
    uploadMbps: 23.1,
    pingMs: 18.6,
    jitterMs: 3.2,
    connectionType: 'wifi',
    ...overrides,
  };
}

// Resposta falsa do Express, só o necessário para testar os middlewares.
function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe('isUuid', () => {
  test('aceita UUID válido (maiúsculo ou minúsculo)', () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid(UUID.toUpperCase())).toBe(true);
  });

  test('recusa valores que não são UUID', () => {
    expect(isUuid('abc')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe('validateResultPayload', () => {
  test('aceita um corpo completo e devolve só os campos conhecidos', () => {
    const result = validateResultPayload({ ...payload(), extra: 'ignorado' });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      clientId: UUID,
      downloadMbps: 87.4,
      uploadMbps: 23.1,
      pingMs: 18.6,
      jitterMs: 3.2,
      connectionType: 'wifi',
    });
  });

  test('jitterMs e connectionType são opcionais', () => {
    const body = payload();
    delete body.jitterMs;
    delete body.connectionType;
    const result = validateResultPayload(body);
    expect(result.valid).toBe(true);
    expect(result.value.jitterMs).toBeNull();
    expect(result.value.connectionType).toBeNull();
  });

  test('arredonda os números para 2 casas', () => {
    const result = validateResultPayload(payload({ downloadMbps: 10.12345, pingMs: 5.678 }));
    expect(result.value.downloadMbps).toBe(10.12);
    expect(result.value.pingMs).toBe(5.68);
  });

  test('normaliza o clientId para minúsculas', () => {
    const result = validateResultPayload(payload({ clientId: UUID.toUpperCase() }));
    expect(result.value.clientId).toBe(UUID);
  });

  test('recusa downloadMbps negativo', () => {
    const result = validateResultPayload(payload({ downloadMbps: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/downloadMbps/);
  });

  test('recusa velocidade acima do teto', () => {
    expect(validateResultPayload(payload({ uploadMbps: 10001 })).valid).toBe(false);
    expect(validateResultPayload(payload({ uploadMbps: 5000 }), { maxMbps: 1000 }).valid).toBe(
      false,
    );
  });

  test('recusa números enviados como texto', () => {
    expect(validateResultPayload(payload({ downloadMbps: '50' })).valid).toBe(false);
  });

  test('recusa NaN, Infinity e campos ausentes', () => {
    expect(validateResultPayload(payload({ pingMs: NaN })).valid).toBe(false);
    expect(validateResultPayload(payload({ pingMs: Infinity })).valid).toBe(false);
    const body = payload();
    delete body.uploadMbps;
    expect(validateResultPayload(body).valid).toBe(false);
  });

  test('recusa clientId inválido', () => {
    expect(validateResultPayload(payload({ clientId: 'nao-e-uuid' })).valid).toBe(false);
  });

  test('recusa jitterMs inválido', () => {
    expect(validateResultPayload(payload({ jitterMs: -2 })).valid).toBe(false);
  });

  test('recusa connectionType longo demais ou que não é texto', () => {
    expect(validateResultPayload(payload({ connectionType: 'x'.repeat(31) })).valid).toBe(false);
    expect(validateResultPayload(payload({ connectionType: 5 })).valid).toBe(false);
  });

  test('connectionType em branco vira null', () => {
    const result = validateResultPayload(payload({ connectionType: '   ' }));
    expect(result.valid).toBe(true);
    expect(result.value.connectionType).toBeNull();
  });

  test('recusa corpo que não é objeto', () => {
    expect(validateResultPayload(null).valid).toBe(false);
    expect(validateResultPayload('texto').valid).toBe(false);
    expect(validateResultPayload([]).valid).toBe(false);
    expect(validateResultPayload(undefined).valid).toBe(false);
  });

  test('acumula todos os erros encontrados', () => {
    const result = validateResultPayload({ clientId: 'x' });
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('middleware validateResult', () => {
  test('corpo válido chama next e guarda o resultado em req.validated', () => {
    const req = { body: payload() };
    const res = fakeRes();
    const next = jest.fn();
    validateResult()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validated.clientId).toBe(UUID);
  });

  test('corpo inválido responde 400 e não chama next', () => {
    const req = { body: payload({ downloadMbps: -5 }) };
    const res = fakeRes();
    const next = jest.fn();
    validateResult()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/downloadMbps/);
  });
});

describe('middleware requireClientId', () => {
  test('aceita clientId válido e normaliza em req.clientId', () => {
    const req = { query: { clientId: UUID.toUpperCase() } };
    const res = fakeRes();
    const next = jest.fn();
    requireClientId(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.clientId).toBe(UUID);
  });

  test('recusa clientId ausente ou inválido com 400', () => {
    for (const query of [{}, { clientId: 'abc' }]) {
      const res = fakeRes();
      const next = jest.fn();
      requireClientId({ query }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    }
  });
});
