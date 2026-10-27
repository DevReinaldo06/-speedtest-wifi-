const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createDatabase } = require('../../src/db/database');
const { createApp } = require('../../src/app');

describe('createDatabase', () => {
  test('cria o arquivo, as pastas e a tabela results quando o caminho é um arquivo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'speedtest-db-'));
    const dbPath = path.join(dir, 'subpasta', 'speedtest.db');

    const db = createDatabase(dbPath);
    try {
      expect(fs.existsSync(dbPath)).toBe(true);
      const table = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'results'")
        .get();
      expect(table.name).toBe('results');
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('banco em memória também recebe a tabela results', () => {
    const db = createDatabase(':memory:');
    const columns = db.prepare('PRAGMA table_info(results)').all().map((c) => c.name);
    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'client_id',
        'download_mbps',
        'upload_mbps',
        'ping_ms',
        'jitter_ms',
        'connection_type',
        'user_agent',
        'created_at',
      ]),
    );
    db.close();
  });

  test('chamar duas vezes não quebra (CREATE IF NOT EXISTS)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'speedtest-db-'));
    const dbPath = path.join(dir, 'speedtest.db');

    createDatabase(dbPath).close();
    const again = createDatabase(dbPath);
    again.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('createApp com valores padrão', () => {
  const originalDbPath = process.env.DB_PATH;
  afterEach(() => {
    if (originalDbPath === undefined) {
      delete process.env.DB_PATH;
    } else {
      process.env.DB_PATH = originalDbPath;
    }
  });

  test('sem argumentos lê o ambiente e cria o próprio banco', async () => {
    process.env.DB_PATH = ':memory:';
    const app = createApp();

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    app.locals.db.close();
  });
});
