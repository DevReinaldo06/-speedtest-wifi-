const { classify } = require('../../src/utils/classify');

describe('classify', () => {
  test.each([
    [0, 'Ruim'],
    [5, 'Ruim'],
    [9.99, 'Ruim'],
    [10, 'Regular'],
    [49.99, 'Regular'],
    [50, 'Boa'],
    [199.99, 'Boa'],
    [200, 'Excelente'],
    [940, 'Excelente'],
  ])('%p Mbps é classificado como %s', (mbps, esperado) => {
    expect(classify(mbps)).toBe(esperado);
  });

  test.each([[-1], [NaN], [Infinity], ['100'], [null], [undefined]])(
    'recusa o valor inválido %p',
    (valor) => {
      expect(() => classify(valor)).toThrow(TypeError);
    },
  );
});
