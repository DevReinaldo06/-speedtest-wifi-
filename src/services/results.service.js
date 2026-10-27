// Regras do histórico de medições: salvar, listar, estatísticas e apagar.
// Todas as consultas são filtradas por client_id, então um navegador
// nunca enxerga o histórico de outro.

function toIsoDate(sqliteDate) {
  // SQLite grava "YYYY-MM-DD HH:MM:SS" em UTC, sem fuso.
  return `${sqliteDate.replace(' ', 'T')}Z`;
}

function toResult(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    downloadMbps: row.download_mbps,
    uploadMbps: row.upload_mbps,
    pingMs: row.ping_ms,
    jitterMs: row.jitter_ms,
    connectionType: row.connection_type,
    createdAt: toIsoDate(row.created_at),
  };
}

function round2(value) {
  return value === null || value === undefined ? null : Math.round(value * 100) / 100;
}

function createResultsService(db) {
  const insertStmt = db.prepare(`
    INSERT INTO results
      (client_id, download_mbps, upload_mbps, ping_ms, jitter_ms, connection_type, user_agent)
    VALUES
      (@clientId, @downloadMbps, @uploadMbps, @pingMs, @jitterMs, @connectionType, @userAgent)
  `);
  const getByIdStmt = db.prepare('SELECT * FROM results WHERE id = ?');
  const listStmt = db.prepare(`
    SELECT * FROM results
    WHERE client_id = ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);
  const countStmt = db.prepare('SELECT COUNT(*) AS total FROM results WHERE client_id = ?');
  const statsStmt = db.prepare(`
    SELECT
      COUNT(*)           AS total,
      AVG(download_mbps) AS avgDownloadMbps,
      MAX(download_mbps) AS maxDownloadMbps,
      MIN(download_mbps) AS minDownloadMbps,
      AVG(upload_mbps)   AS avgUploadMbps,
      MAX(upload_mbps)   AS maxUploadMbps,
      MIN(upload_mbps)   AS minUploadMbps,
      AVG(ping_ms)       AS avgPingMs,
      MIN(ping_ms)       AS minPingMs
    FROM results
    WHERE client_id = ?
  `);
  const deleteOneStmt = db.prepare('DELETE FROM results WHERE id = ? AND client_id = ?');
  const deleteAllStmt = db.prepare('DELETE FROM results WHERE client_id = ?');

  return {
    // `data` já vem validado; `userAgent` é opcional.
    create(data, userAgent = null) {
      const info = insertStmt.run({
        ...data,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      });
      return toResult(getByIdStmt.get(info.lastInsertRowid));
    },

    list(clientId, { page = 1, limit = 10 } = {}) {
      const offset = (page - 1) * limit;
      const items = listStmt.all(clientId, limit, offset).map(toResult);
      const { total } = countStmt.get(clientId);
      return { items, total, page, limit };
    },

    stats(clientId) {
      const row = statsStmt.get(clientId);
      return {
        total: row.total,
        avgDownloadMbps: round2(row.avgDownloadMbps),
        maxDownloadMbps: round2(row.maxDownloadMbps),
        minDownloadMbps: round2(row.minDownloadMbps),
        avgUploadMbps: round2(row.avgUploadMbps),
        maxUploadMbps: round2(row.maxUploadMbps),
        minUploadMbps: round2(row.minUploadMbps),
        avgPingMs: round2(row.avgPingMs),
        minPingMs: round2(row.minPingMs),
      };
    },

    // Devolve true se apagou, false se o registro não existe (ou é de outro cliente).
    remove(clientId, id) {
      return deleteOneStmt.run(id, clientId).changes > 0;
    },

    clear(clientId) {
      return deleteAllStmt.run(clientId).changes;
    },
  };
}

module.exports = { createResultsService };
