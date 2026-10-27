-- Histórico de medições de velocidade.
-- Cada navegador é identificado por um UUID anônimo (client_id).
CREATE TABLE IF NOT EXISTS results (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id       TEXT    NOT NULL,
  download_mbps   REAL    NOT NULL,
  upload_mbps     REAL    NOT NULL,
  ping_ms         REAL    NOT NULL,
  jitter_ms       REAL,
  connection_type TEXT,
  user_agent      TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_client_id ON results (client_id);
