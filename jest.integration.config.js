const base = require('./jest.config');

// Testes de integração: API completa (Supertest) com SQLite em memória.
// src/utils fica de fora porque são funções puras, cobertas pelo estágio unitário.
module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/utils/**'],
};
