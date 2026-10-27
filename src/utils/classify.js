// Classificação da conexão pela velocidade de download em Mbps.
//   menos de 10   -> Ruim
//   10 a 49,99    -> Regular
//   50 a 199,99   -> Boa
//   200 ou mais   -> Excelente
const FAIXAS = [
  { minimo: 200, rotulo: 'Excelente' },
  { minimo: 50, rotulo: 'Boa' },
  { minimo: 10, rotulo: 'Regular' },
  { minimo: 0, rotulo: 'Ruim' },
];

function classify(mbps) {
  if (typeof mbps !== 'number' || !Number.isFinite(mbps) || mbps < 0) {
    throw new TypeError('mbps deve ser um número maior ou igual a zero');
  }
  return FAIXAS.find((faixa) => mbps >= faixa.minimo).rotulo;
}

module.exports = { classify, FAIXAS };
