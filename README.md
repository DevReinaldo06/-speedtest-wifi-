# SpeedTest Wifi

Sistema web que mede a velocidade de **download**, **upload** e **ping** da conexão de quem o acessa e guarda um **histórico** das medições. Projeto da matéria *Cultura e Práticas DevOps*, com foco na esteira CI/CD no GitHub Actions.

> **Estado atual: Parte 1 de 2.** Back-end completo, testes unitários e de integração, Docker e pipeline. A interface (front-end), os testes E2E e a documentação final chegam na Parte 2.

## Como rodar localmente

Pré-requisito: [Node.js 22 ou superior](https://nodejs.org/) (confira com `node -v`).

```bash
npm install
npm run dev        # servidor com recarga automática em http://localhost:3000
```

Para rodar sem recarga automática: `npm start`.

Verifique se está no ar: <http://localhost:3000/api/health>

## Como rodar com Docker

```bash
docker compose up --build
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor com recarga automática |
| `npm start` | Servidor normal |
| `npm run lint` | ESLint |
| `npm run build` | Valida o projeto e monta `dist/` |
| `npm run test:unit` | Testes unitários, com cobertura mínima de 80% |
| `npm run test:integration` | Testes de integração da API, com cobertura mínima de 80% |
| `npm test` | Unitários e integração em sequência |
| `npm run audit` | Procura vulnerabilidades altas ou críticas nas dependências |

## Endpoints da API

| Método e rota | Função |
| --- | --- |
| `GET /api/health` | Confirma que o sistema e o banco estão no ar |
| `GET /api/config` | Limites e modo rápido (usado pelo front-end) |
| `GET /api/ping` | Alvo das medições de latência (`204`) |
| `GET /api/speedtest/download?size=N` | Envia N bytes aleatórios |
| `POST /api/speedtest/upload` | Recebe um corpo binário e informa o tamanho |
| `POST /api/results` | Salva uma medição |
| `GET /api/results?clientId=...&page=1&limit=10` | Lista o histórico |
| `GET /api/results/stats?clientId=...` | Média, máximo, mínimo e total |
| `DELETE /api/results/:id?clientId=...` | Apaga uma medição |
| `DELETE /api/results?clientId=...` | Limpa o histórico |

Exemplo de `POST /api/results`:

```json
{
  "clientId": "7b1f0c2e-9a4d-4e1b-8f55-2d3c6a7e9b10",
  "downloadMbps": 87.4,
  "uploadMbps": 23.1,
  "pingMs": 18.6,
  "jitterMs": 3.2,
  "connectionType": "wifi"
}
```

## Pipeline

O arquivo `.github/workflows/ci-cd.yml` define a esteira:

```text
lint -> build -> test-unit -> test-integration -> security -> docker -> deploy
```

Se um estágio falha, os seguintes não executam. Os estágios `docker` e `deploy` só rodam na branch `main`.

Segredo necessário para o deploy: `RENDER_DEPLOY_HOOK_URL` (Settings > Secrets and variables > Actions > Secrets). Variável opcional: `APP_URL`, com o endereço do site publicado, para a pipeline confirmar o deploy.

## Licença

MIT. Veja o arquivo `LICENSE`.
