const { loadConfig, toPositiveInt } = require('../../src/config');

describe('toPositiveInt', () => {
  test('converte texto numérico em inteiro', () => {
    expect(toPositiveInt('8080', 3000)).toBe(8080);
  });

  test('usa o padrão para valores inválidos, zero ou negativos', () => {
    expect(toPositiveInt(undefined, 3000)).toBe(3000);
    expect(toPositiveInt('abc', 3000)).toBe(3000);
    expect(toPositiveInt('0', 3000)).toBe(3000);
    expect(toPositiveInt('-5', 3000)).toBe(3000);
  });
});

describe('loadConfig', () => {
  test('sem variáveis de ambiente usa os valores padrão', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.maxDownloadBytes).toBe(50 * 1024 * 1024);
    expect(config.maxUploadBytes).toBe(25 * 1024 * 1024);
    expect(config.fastMode).toBe(false);
    expect(config.commit).toBe('dev');
    expect(config.dbPath).toMatch(/speedtest\.db$/);
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('lê as variáveis de ambiente', () => {
    const config = loadConfig({
      PORT: '8080',
      DB_PATH: ':memory:',
      MAX_DOWNLOAD_MB: '10',
      MAX_UPLOAD_MB: '5',
      RATE_LIMIT_MAX: '20',
      RATE_LIMIT_WINDOW_MS: '1000',
      SPEEDTEST_FAST: '1',
      GIT_COMMIT: 'abc123',
    });
    expect(config.port).toBe(8080);
    expect(config.dbPath).toBe(':memory:');
    expect(config.maxDownloadBytes).toBe(10 * 1024 * 1024);
    expect(config.maxUploadBytes).toBe(5 * 1024 * 1024);
    expect(config.rateLimitMax).toBe(20);
    expect(config.rateLimitWindowMs).toBe(1000);
    expect(config.fastMode).toBe(true);
    expect(config.commit).toBe('abc123');
  });

  test('usa o commit do Render ou do GitHub quando GIT_COMMIT não existe', () => {
    expect(loadConfig({ RENDER_GIT_COMMIT: 'render1' }).commit).toBe('render1');
    expect(loadConfig({ GITHUB_SHA: 'gh1' }).commit).toBe('gh1');
  });
});
