#!/usr/bin/env bash
# Espera o servidor responder em /api/health antes de rodar os testes E2E.
# Uso: bash scripts/wait-for-server.sh [URL_BASE] [TENTATIVAS]
set -euo pipefail

URL="${1:-http://localhost:3000}"
TENTATIVAS="${2:-30}"

for i in $(seq 1 "$TENTATIVAS"); do
  if curl -fsS "$URL/api/health" > /dev/null 2>&1; then
    echo "Servidor respondendo em $URL"
    exit 0
  fi
  echo "Aguardando o servidor ($i/$TENTATIVAS)..."
  sleep 1
done

echo "ERRO: o servidor não respondeu em $URL a tempo" >&2
exit 1
