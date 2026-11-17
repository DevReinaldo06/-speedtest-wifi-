# Speedtest Wi-Fi

Medidor de velocidade de internet (ping, download, upload) com histórico e uma aba **Esteira**
que mostra a versão/commit em execução e as últimas execuções do GitHub Actions.
O foco do projeto é a **esteira DevSecOps** em `.github/workflows/pipeline.yml`.

## Rodar
```bash
npm install
npm start      # http://localhost:3000
npm test
```

## Estrutura
- `server.js` – API (Express): health, info, ping, download, upload, histórico
- `public/` – telas Teste, Histórico e Esteira (HTML, CSS, JS)
- `test/app.test.js` – testes automatizados
- `.semgrep/rules.yml` – regras do SAST
- `.zap/rules.tsv` – regras do DAST
- `.github/workflows/pipeline.yml` – a esteira
