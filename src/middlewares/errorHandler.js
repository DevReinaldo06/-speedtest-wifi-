// Resposta para rotas /api inexistentes.
function apiNotFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

// Tratamento central de erros: sempre responde com JSON { error }.
// O quarto parâmetro (_next) precisa existir para o Express reconhecer
// esta função como tratador de erros.
function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = 'Erro interno do servidor';

  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Corpo da requisição acima do limite permitido';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  } else if (status >= 400 && status < 500) {
    message = err.message || 'Requisição inválida';
  } else {
    status = 500;
    if (process.env.NODE_ENV !== 'test') {
      console.error(err);
    }
  }

  if (res.headersSent) {
    return res.end();
  }
  return res.status(status).json({ error: message });
}

module.exports = { apiNotFound, errorHandler };
