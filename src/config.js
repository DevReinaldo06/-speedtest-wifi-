const path = require('path');
const pkg = require('../package.json');

const MB = 1024 * 1024;

// Converte um texto em inteiro positivo; se for inválido, usa o valor padrão.
function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Lê as variáveis de ambiente e devolve a configuração do sistema.
// Recebe `env` como parâmetro para ser fácil de testar.
function loadConfig(env = process.env) {
  return {
    port: toPositiveInt(env.PORT, 3000),
    dbPath: env.DB_PATH || path.join(__dirname, '..', 'data', 'speedtest.db'),
    maxDownloadBytes: toPositiveInt(env.MAX_DOWNLOAD_MB, 50) * MB,
    maxUploadBytes: toPositiveInt(env.MAX_UPLOAD_MB, 25) * MB,
    rateLimitWindowMs: toPositiveInt(env.RATE_LIMIT_WINDOW_MS, 60000),
    rateLimitMax: toPositiveInt(env.RATE_LIMIT_MAX, 600),
    fastMode: env.SPEEDTEST_FAST === '1',
    maxMbps: 10000,
    maxMs: 60000,
    version: pkg.version,
    commit: env.GIT_COMMIT || env.RENDER_GIT_COMMIT || env.GITHUB_SHA || 'dev',
  };
}

module.exports = { loadConfig, toPositiveInt };
