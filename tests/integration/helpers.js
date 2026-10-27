const request = require('supertest');
const { createApp } = require('../../src/app');
const { loadConfig } = require('../../src/config');
const { createDatabase } = require('../../src/db/database');

const CLIENT_A = '7b1f0c2e-9a4d-4e1b-8f55-2d3c6a7e9b10';
const CLIENT_B = '0e6c1d4a-3b52-4f7e-9a18-5c2d7f8b3a64';

// Cria um app novo com banco SQLite em memória (isolado por teste).
function makeApp(envOverrides = {}) {
  const config = loadConfig({ DB_PATH: ':memory:', ...envOverrides });
  const db = createDatabase(':memory:');
  const app = createApp({ config, db });
  return { app, db, config, agent: request(app) };
}

function validResult(overrides = {}) {
  return {
    clientId: CLIENT_A,
    downloadMbps: 87.4,
    uploadMbps: 23.1,
    pingMs: 18.6,
    jitterMs: 3.2,
    connectionType: 'wifi',
    ...overrides,
  };
}

// Parser que entrega respostas binárias como Buffer.
function binaryParser(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

module.exports = { makeApp, validResult, binaryParser, CLIENT_A, CLIENT_B };
