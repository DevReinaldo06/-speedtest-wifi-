const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();
const app = createApp({ config });

const server = app.listen(config.port, '0.0.0.0', () => {
  console.info(`SpeedTest Wifi v${config.version} (${config.commit}) em http://localhost:${config.port}`);
});

// Encerramento limpo: fecha o servidor e o banco quando a plataforma manda parar.
function shutdown(signal) {
  console.info(`${signal} recebido, encerrando...`);
  server.close(() => {
    app.locals.db.close();
    process.exit(0);
  });
  // Se alguma conexão ficar aberta, força a saída depois de 10 segundos.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
