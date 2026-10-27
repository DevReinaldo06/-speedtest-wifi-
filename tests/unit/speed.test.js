const { bytesToMbps, average, jitter, round } = require('../../src/utils/speed');

describe('bytesToMbps', () => {
  test('12.500.000 bytes em 1 segundo equivalem a 100 Mbps', () => {
    expect(bytesToMbps(12_500_000, 1)).toBe(100);
  });

  test('o dobro de tempo divide a velocidade pela metade', () => {
    expect(bytesToMbps(12_500_000, 2)).toBe(50);
  });

  test('zero bytes resulta em 0 Mbps', () => {
    expect(bytesToMbps(0, 1)).toBe(0);
  });

  test('recusa tempo zero ou negativo', () => {
    expect(() => bytesToMbps(1000, 0)).toThrow(RangeError);
    expect(() => bytesToMbps(1000, -1)).toThrow(RangeError);
  });

  test('recusa bytes negativos ou inválidos', () => {
    expect(() => bytesToMbps(-1, 1)).toThrow(RangeError);
    expect(() => bytesToMbps(NaN, 1)).toThrow(RangeError);
    expect(() => bytesToMbps(1000, NaN)).toThrow(RangeError);
  });
});

describe('average', () => {
  test('calcula a média', () => {
    expect(average([10, 20, 30])).toBe(20);
  });

  test('lista vazia ou inválida retorna 0', () => {
    expect(average([])).toBe(0);
    expect(average(undefined)).toBe(0);
  });
});

describe('jitter', () => {
  test('amostras iguais têm jitter 0', () => {
    expect(jitter([10, 10, 10, 10])).toBe(0);
  });

  test('média da diferença entre amostras consecutivas', () => {
    // |20-10| = 10 e |10-20| = 10 -> média 10
    expect(jitter([10, 20, 10])).toBe(10);
  });

  test('menos de duas amostras resulta em 0', () => {
    expect(jitter([15])).toBe(0);
    expect(jitter([])).toBe(0);
    expect(jitter(null)).toBe(0);
  });
});

describe('round', () => {
  test('arredonda para 2 casas por padrão', () => {
    expect(round(3.14159)).toBe(3.14);
  });

  test('aceita outro número de casas', () => {
    expect(round(3.14159, 3)).toBe(3.142);
    expect(round(7.5, 0)).toBe(8);
  });
});
