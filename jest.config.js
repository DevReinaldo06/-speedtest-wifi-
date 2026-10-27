// Configuração base do Jest, compartilhada pelos testes unitários e de integração.
// Os dois estágios da pipeline usam arquivos próprios (jest.unit.config.js e
// jest.integration.config.js), cada um com a sua cobertura mínima.
const COVERAGE_MINIMO = 80;

module.exports = {
  testEnvironment: 'node',
  coverageReporters: ['text-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: COVERAGE_MINIMO,
      branches: COVERAGE_MINIMO,
      functions: COVERAGE_MINIMO,
      lines: COVERAGE_MINIMO,
    },
  },
};
