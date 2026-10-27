const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Abre (ou cria) o banco SQLite e garante que as tabelas existem.
// Use ':memory:' como caminho para um banco temporário (testes).
function createDatabase(dbPath) {
  const inMemory = dbPath === ':memory:';

  if (!inMemory) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  if (!inMemory) {
    db.pragma('journal_mode = WAL');
  }
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

module.exports = { createDatabase };
