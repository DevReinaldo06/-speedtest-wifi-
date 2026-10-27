#!/usr/bin/env bash
# Etapa de build da pipeline.
# Projeto em JavaScript não compila, então "build" aqui significa:
#   1. conferir que os arquivos obrigatórios existem;
#   2. checar a sintaxe de todos os arquivos .js (o equivalente a "compilar");
#   3. montar a pasta dist/ com o que vai para produção;
#   4. gravar dist/version.json com a versão e o commit.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> [1/4] Conferindo arquivos obrigatórios"
OBRIGATORIOS=(package.json package-lock.json src/server.js src/app.js src/db/schema.sql public/index.html Dockerfile)
for arquivo in "${OBRIGATORIOS[@]}"; do
  if [ ! -f "$arquivo" ]; then
    echo "ERRO: arquivo obrigatório não encontrado: $arquivo" >&2
    exit 1
  fi
done

echo "==> [2/4] Checando a sintaxe dos arquivos JavaScript"
while IFS= read -r -d '' arquivo; do
  node --check "$arquivo"
done < <(find src -name '*.js' -print0)

echo "==> [3/4] Montando dist/"
rm -rf dist
mkdir -p dist
cp -r src public package.json package-lock.json Dockerfile dist/

echo "==> [4/4] Gravando dist/version.json"
VERSAO="$(node -p "require('./package.json').version")"
COMMIT="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo dev)}"
DATA="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > dist/version.json <<EOF
{
  "version": "${VERSAO}",
  "commit": "${COMMIT}",
  "builtAt": "${DATA}"
}
EOF

echo "Build concluído: versão ${VERSAO}, commit ${COMMIT}"
