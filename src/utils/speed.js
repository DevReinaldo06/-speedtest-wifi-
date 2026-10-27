// Funções puras de cálculo de velocidade (sem rede nem banco).

// Converte bytes transferidos em um tempo (segundos) para Mbps.
// Mbps = bytes * 8 / segundos / 1.000.000
function bytesToMbps(bytes, seconds) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError('bytes deve ser um número maior ou igual a zero');
  }
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError('seconds deve ser um número maior que zero');
  }
  return (bytes * 8) / seconds / 1_000_000;
}

// Média aritmética de uma lista de números (lista vazia retorna 0).
function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

// Jitter: média da diferença absoluta entre amostras de ping consecutivas.
function jitter(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return 0;
  }
  const diffs = [];
  for (let i = 1; i < samples.length; i += 1) {
    diffs.push(Math.abs(samples[i] - samples[i - 1]));
  }
  return average(diffs);
}

// Arredonda para `decimals` casas decimais.
function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

module.exports = { bytesToMbps, average, jitter, round };
