const { apiNotFound, errorHandler } = require('../../src/middlewares/errorHandler');
const { createRateLimiter } = require('../../src/middlewares/rateLimit');

// Resposta falsa do Express, só o necessário para testar os middlewares.
function fakeRes({ headersSent = false } = {}) {
  const res = { statusCode: 200, body: undefined, headersSent, ended: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.set = jest.fn();
  res.end = () => {
    res.ended = true;
    return res;
  };
  return res;
}

describe('apiNotFound', () => {
  test('responde 404 com JSON', () => {
    const res = fakeRes();
    apiNotFound({}, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Rota não encontrada' });
  });
});

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  test('erro 4xx devolve a mensagem do próprio erro', () => {
    const res = fakeRes();
    const err = Object.assign(new Error('Sem permissão'), { status: 403 });
    errorHandler(err, {}, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Sem permissão' });
  });

  test('erro 4xx sem mensagem usa um texto padrão', () => {
    const res = fakeRes();
    errorHandler({ statusCode: 422, message: '' }, {}, res, () => {});
    expect(res.statusCode).toBe(422);
    expect(res.body.error).toBe('Requisição inválida');
  });

  test('erro desconhecido vira 500 genérico, sem vazar detalhes', () => {
    const res = fakeRes();
    errorHandler(new Error('segredo interno'), {}, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
  });

  test('fora do ambiente de teste, o erro 500 é registrado no log', () => {
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('falha'), {}, fakeRes(), () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('status 5xx explícito também vira 500 genérico', () => {
    const res = fakeRes();
    errorHandler(Object.assign(new Error('x'), { status: 503 }), {}, res, () => {});
    expect(res.statusCode).toBe(500);
  });

  test('se a resposta já foi enviada, apenas encerra', () => {
    const res = fakeRes({ headersSent: true });
    errorHandler(new Error('x'), {}, res, () => {});
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
  });
});

describe('createRateLimiter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sem req.ip usa uma chave padrão', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = jest.fn();
    limiter({}, fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = fakeRes();
    limiter({}, res, jest.fn());
    expect(res.statusCode).toBe(429);
  });

  test('a janela reinicia depois que o tempo passa', () => {
    const now = jest.spyOn(Date, 'now');
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

    now.mockReturnValue(0);
    limiter({ ip: '1.1.1.1' }, fakeRes(), jest.fn());
    const blocked = fakeRes();
    limiter({ ip: '1.1.1.1' }, blocked, jest.fn());
    expect(blocked.statusCode).toBe(429);

    now.mockReturnValue(2000);
    const next = jest.fn();
    limiter({ ip: '1.1.1.1' }, fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('limpa entradas vencidas quando o mapa fica muito grande', () => {
    const now = jest.spyOn(Date, 'now');
    const limiter = createRateLimiter({ windowMs: 1000, max: 5 });

    now.mockReturnValue(0);
    for (let i = 0; i <= 10000; i += 1) {
      limiter({ ip: `ip-${i}` }, fakeRes(), jest.fn());
    }

    now.mockReturnValue(5000);
    const next = jest.fn();
    limiter({ ip: 'novo' }, fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
