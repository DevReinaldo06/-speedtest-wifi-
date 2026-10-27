const crypto = require('crypto');

const DEFAULT_DOWNLOAD_BYTES = 1024 * 1024; // 1 MB quando ?size não é informado
const CHUNK_BYTES = 256 * 1024;

function createSpeedtestController(config) {
  // Bloco de bytes aleatórios gerado uma vez e repetido no envio:
  // barato para o servidor e incompressível para a rede.
  const chunk = crypto.randomBytes(CHUNK_BYTES);

  return {
    // Alvo das medições de latência: resposta vazia e sem cache.
    ping(req, res) {
      res.set('Cache-Control', 'no-store');
      res.status(204).end();
    },

    // Envia `size` bytes aleatórios para o navegador medir o download.
    download(req, res) {
      let size = DEFAULT_DOWNLOAD_BYTES;
      if (req.query.size !== undefined) {
        const raw = req.query.size;
        if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
          return res.status(400).json({ error: 'size deve ser um número inteiro de bytes' });
        }
        size = Number(raw);
      }
      if (size < 1 || size > config.maxDownloadBytes) {
        return res
          .status(400)
          .json({ error: `size deve estar entre 1 e ${config.maxDownloadBytes} bytes` });
      }

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
        'Cache-Control': 'no-store',
        'Content-Encoding': 'identity',
      });

      let remaining = size;
      let aborted = false;
      res.on('close', () => {
        aborted = true;
      });

      // Escreve respeitando o backpressure para não encher a memória.
      function writeMore() {
        while (remaining > 0 && !aborted) {
          const length = Math.min(chunk.length, remaining);
          const ok = res.write(length === chunk.length ? chunk : chunk.subarray(0, length));
          remaining -= length;
          if (!ok) {
            res.once('drain', writeMore);
            return;
          }
        }
        if (!aborted) {
          res.end();
        }
      }
      writeMore();
      return undefined;
    },

    // Recebe o corpo binário (já lido pelo express.raw) e só informa o tamanho.
    upload(req, res) {
      const receivedBytes = Buffer.isBuffer(req.body) ? req.body.length : 0;
      res.set('Cache-Control', 'no-store');
      res.json({ receivedBytes });
    },

    // Informa ao navegador os limites e se o modo rápido está ligado.
    settings(req, res) {
      res.json({
        fastMode: config.fastMode,
        maxDownloadBytes: config.maxDownloadBytes,
        maxUploadBytes: config.maxUploadBytes,
      });
    },
  };
}

module.exports = { createSpeedtestController, DEFAULT_DOWNLOAD_BYTES };
