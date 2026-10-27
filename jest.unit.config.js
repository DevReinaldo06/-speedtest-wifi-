const base = require('./jest.config');

// Testes unitários: só funções puras e o validador (sem rede nem banco).
module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/config.js',
    'src/middlewares/validateResult.js',
  ],
};
