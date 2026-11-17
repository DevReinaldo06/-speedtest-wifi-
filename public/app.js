// Front-end do Speedtest Wi-Fi: 3 telas (Teste, Histórico, Esteira) numa página só.
// Todo texto vindo do servidor ou do GitHub entra na página com textContent
// (nunca innerHTML), para que nenhum dado consiga injetar HTML.

const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const MB = 1024 * 1024;

// ---------------------------------------------------------------- utilidades
const mbps = (bytes, ms) => (bytes * 8) / 1e6 / (ms / 1000);
const fmt = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
const dataBr = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function classificar(download) {
  if (download >= 100) return 'excelente';
  if (download >= 50) return 'muito boa';
  if (download >= 20) return 'boa';
  return 'lenta';
}

async function pedirJson(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) throw new Error('erro ' + resposta.status);
  return resposta.status === 204 ? null : resposta.json();
}

function el(nome, texto, classe) {
  const e = document.createElement(nome);
  if (texto !== undefined) e.textContent = texto;
  if (classe) e.className = classe;
  return e;
}

// ---------------------------------------------------------------- navegação
const TELAS = ['teste', 'historico', 'esteira'];

function mostrarTela() {
  const alvo = TELAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'teste';
  for (const nome of TELAS) {
    $('view-' + nome).hidden = nome !== alvo;
  }
  document.querySelectorAll('.tab').forEach((aba) => {
    if (aba.dataset.view === alvo) aba.setAttribute('aria-current', 'page');
    else aba.removeAttribute('aria-current');
  });
  if (alvo === 'historico') carregarHistorico();
  if (alvo === 'esteira') carregarEsteira();
}

// ---------------------------------------------------------------- velocímetro
function desenharGauge(valor) {
  // escala logarítmica: 0 a 1000 Mbps ocupa o arco inteiro
  const fracao = Math.min(Math.log10(1 + valor) / Math.log10(1001), 1);
  $('gauge-arco').setAttribute('stroke-dashoffset', String(100 - fracao * 100));
  $('gauge-valor').textContent = valor >= 100 ? valor.toFixed(0) : valor.toFixed(1);
}

function marcarEtapa(atual) {
  const ordem = ['ping', 'download', 'upload', 'salvo'];
  document.querySelectorAll('#etapas li').forEach((li) => {
    const i = ordem.indexOf(li.dataset.etapa);
    li.classList.toggle('ativa', li.dataset.etapa === atual);
    li.classList.toggle('feita', atual !== null && i < ordem.indexOf(atual));
  });
}

// ---------------------------------------------------------------- medições
async function medirPing() {
  const tempos = [];
  for (let i = 0; i < 6; i += 1) {
    const inicio = performance.now();
    await fetch('/api/ping?n=' + i, { cache: 'no-store' });
    tempos.push(performance.now() - inicio);
  }
  tempos.shift(); // a primeira abre a conexão e não conta
  return tempos.reduce((a, b) => a + b, 0) / tempos.length;
}

// Baixa blocos de 5 MB por cerca de 5 segundos e calcula a velocidade média.
async function medirDownload(aoProgredir) {
  const inicio = performance.now();
  let bytes = 0;
  for (let i = 0; i < 20 && performance.now() - inicio < 5000; i += 1) {
    const resposta = await fetch('/api/download?mb=5&r=' + Math.random(), { cache: 'no-store' });
    if (!resposta.ok) throw new Error('download recusado (' + resposta.status + ')');
    const leitor = resposta.body.getReader();
    for (;;) {
      const parte = await leitor.read();
      if (parte.done) break;
      bytes += parte.value.byteLength;
      aoProgredir(mbps(bytes, performance.now() - inicio));
    }
  }
  return mbps(bytes, performance.now() - inicio);
}

function enviarBloco(bloco, aoEnviar) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let anterior = 0;
    xhr.open('POST', '/api/upload?r=' + Math.random());
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      aoEnviar(e.loaded - anterior);
      anterior = e.loaded;
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        aoEnviar(bloco.byteLength - anterior);
        resolve();
      } else {
        reject(new Error('upload recusado (' + xhr.status + ')'));
      }
    };
    xhr.onerror = () => reject(new Error('falha de rede no upload'));
    xhr.send(bloco);
  });
}

async function medirUpload(aoProgredir) {
  const bloco = new Uint8Array(2 * MB);
  const inicio = performance.now();
  let bytes = 0;
  for (let i = 0; i < 20 && performance.now() - inicio < 4000; i += 1) {
    await enviarBloco(bloco, (n) => {
      bytes += n;
      aoProgredir(mbps(bytes, performance.now() - inicio));
    });
  }
  return mbps(bytes, performance.now() - inicio);
}

async function iniciarTeste() {
  const botao = $('iniciar');
  botao.disabled = true;
  ['res-download', 'res-upload', 'res-ping'].forEach((id) => ($(id).textContent = '-'));
  $('classe').textContent = '-';
  $('classe').dataset.nivel = 'nenhum';
  desenharGauge(0);
  $('gauge-unidade').textContent = 'Mbps';

  try {
    marcarEtapa('ping');
    $('status').textContent = 'Medindo o ping...';
    const ping = await medirPing();
    $('res-ping').textContent = ping.toFixed(1);

    marcarEtapa('download');
    $('status').textContent = 'Medindo o download...';
    const download = await medirDownload(desenharGauge);
    $('res-download').textContent = fmt(download);
    desenharGauge(download);

    marcarEtapa('upload');
    $('status').textContent = 'Medindo o upload...';
    const upload = await medirUpload(desenharGauge);
    $('res-upload').textContent = fmt(upload);
    desenharGauge(upload);

    const nivel = classificar(download);
    $('classe').textContent = nivel;
    $('classe').dataset.nivel = nivel;

    await pedirJson('/api/historico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download, upload, ping }),
    });
    marcarEtapa('salvo');
    document.querySelector('#etapas li[data-etapa="salvo"]').classList.add('feita');
    $('status').textContent = 'Concluído e salvo no histórico.';
  } catch (erro) {
    marcarEtapa(null);
    $('status').textContent = 'O teste não foi concluído: ' + erro.message;
  }
  botao.disabled = false;
}

// ---------------------------------------------------------------- histórico
function no(nome, atributos) {
  const e = document.createElementNS(SVG, nome);
  for (const chave of Object.keys(atributos || {})) e.setAttribute(chave, String(atributos[chave]));
  return e;
}

function desenharGrafico(itens) {
  const area = $('grafico');
  area.textContent = '';
  if (itens.length === 0) {
    area.appendChild(el('p', 'O gráfico aparece depois da primeira medição.', 'vazio'));
    return;
  }
  const L = 640;
  const A = 240;
  const m = { e: 44, d: 14, c: 14, b: 26 };
  const maximo = Math.max(10, ...itens.map((i) => Math.max(i.download, i.upload))) * 1.1;
  const x = (i) => (itens.length === 1 ? L / 2 : m.e + (i * (L - m.e - m.d)) / (itens.length - 1));
  const y = (v) => A - m.b - (v / maximo) * (A - m.b - m.c);

  const svg = no('svg', { viewBox: '0 0 ' + L + ' ' + A, role: 'img', 'aria-label': 'Gráfico de download e upload' });
  for (let k = 0; k <= 4; k += 1) {
    const v = (maximo / 4) * k;
    svg.appendChild(no('line', { x1: m.e, x2: L - m.d, y1: y(v), y2: y(v), class: 'ch-grade' }));
    const t = no('text', { x: m.e - 6, y: y(v) + 3, 'text-anchor': 'end', class: 'ch-texto' });
    t.textContent = v === 0 ? '0' : fmt(v);
    svg.appendChild(t);
  }
  for (const [campo, tipo] of [['download', 'down'], ['upload', 'up']]) {
    if (itens.length > 1) {
      const d = itens.map((it, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(it[campo]).toFixed(1)).join(' ');
      svg.appendChild(no('path', { d, class: 'ch-' + tipo }));
    }
    itens.forEach((it, i) => {
      const c = no('circle', { cx: x(i), cy: y(it[campo]), r: 3.5, class: 'pt-' + tipo });
      const titulo = no('title');
      titulo.textContent = campo + ': ' + fmt(it[campo]) + ' Mbps em ' + dataBr(it.data);
      c.appendChild(titulo);
      svg.appendChild(c);
    });
  }
  area.appendChild(svg);
}

async function carregarHistorico() {
  let lista;
  try {
    lista = await pedirJson('/api/historico');
  } catch (erro) {
    $('vazio').textContent = 'Não foi possível carregar o histórico: ' + erro.message;
    $('vazio').hidden = false;
    return;
  }
  const media = (campo) => (lista.length ? lista.reduce((s, i) => s + i[campo], 0) / lista.length : null);
  $('st-total').textContent = String(lista.length);
  $('st-down').textContent = lista.length ? fmt(media('download')) : '-';
  $('st-up').textContent = lista.length ? fmt(media('upload')) : '-';
  $('st-ping').textContent = lista.length ? media('ping').toFixed(1) : '-';

  $('vazio').textContent = 'Nenhuma medição ainda. Faça o primeiro teste na aba Teste.';
  $('vazio').hidden = lista.length > 0;
  $('tabela').hidden = lista.length === 0;
  $('limpar').hidden = lista.length === 0;

  const corpo = $('corpo');
  corpo.textContent = '';
  for (const item of lista) {
    const linha = corpo.insertRow();
    linha.dataset.testid = 'linha-historico';
    linha.insertCell().textContent = dataBr(item.data);
    linha.insertCell().textContent = fmt(item.download) + ' Mbps';
    linha.insertCell().textContent = fmt(item.upload) + ' Mbps';
    linha.insertCell().textContent = item.ping.toFixed(1) + ' ms';
    const nivel = classificar(item.download);
    const selo = el('span', nivel, 'selo');
    selo.dataset.nivel = nivel;
    linha.insertCell().appendChild(selo);
  }
  desenharGrafico(lista.slice(0, 30).reverse());
}

async function limparHistorico() {
  if (!window.confirm('Apagar todo o histórico? Esta ação não pode ser desfeita.')) return;
  await pedirJson('/api/historico', { method: 'DELETE' });
  carregarHistorico();
}

// ---------------------------------------------------------------- esteira
const ETAPAS = ['secrets', 'sast', 'sca', 'test', 'dast', 'deploy'];
const ICONES = { sucesso: '✓', falha: '✗', andamento: '…', pulado: '⏭' };
let infoCarregada = null;
let ultimaConsulta = 0;

function estado(item) {
  if (item.status !== 'completed') return 'andamento';
  if (item.conclusion === 'success') return 'sucesso';
  if (item.conclusion === 'failure' || item.conclusion === 'timed_out') return 'falha';
  return 'pulado';
}

async function carregarInfo() {
  if (!infoCarregada) infoCarregada = await pedirJson('/api/info');
  const info = infoCarregada;
  const curto = info.commit && info.commit !== 'local' ? info.commit.slice(0, 7) : 'local';
  $('versao-topo').textContent = 'v' + info.versao + ' · ' + curto;
  $('i-versao').textContent = info.versao;
  $('i-ambiente').textContent = info.ambiente;
  $('i-inicio').textContent = dataBr(info.iniciadoEm);
  const link = $('i-commit');
  link.textContent = curto === 'local' ? 'local (fora da esteira)' : curto;
  if (curto === 'local') {
    link.removeAttribute('href');
  } else {
    link.href = 'https://github.com/' + info.repositorio + '/commit/' + info.commit;
  }
  return info;
}

async function carregarEsteira() {
  let info;
  try {
    info = await carregarInfo();
  } catch {
    $('e-status').textContent = 'Não foi possível ler as informações da versão.';
    return;
  }
  if (Date.now() - ultimaConsulta < 60000) return; // evita estourar o limite do GitHub
  ultimaConsulta = Date.now();

  const base = 'https://api.github.com/repos/' + info.repositorio + '/actions';
  try {
    const corridas = await pedirJson(base + '/runs?per_page=8');
    const lista = corridas.workflow_runs || [];
    const principal = lista.find((r) => r.head_branch === 'main') || lista[0];

    const ul = $('execucoes');
    ul.textContent = '';
    for (const r of lista.slice(0, 6)) {
      const li = el('li');
      const bolinha = el('span', '', 'bolinha');
      bolinha.dataset.st = estado(r);
      li.appendChild(bolinha);
      li.appendChild(el('span', r.display_title, 'msg'));
      li.appendChild(el('span', r.head_branch + ' · ' + dataBr(r.created_at), 'meta'));
      ul.appendChild(li);
    }

    if (!principal) {
      $('e-status').textContent = 'Nenhuma execução encontrada.';
      return;
    }
    const link = $('e-link');
    link.href = principal.html_url;
    link.hidden = false;
    $('e-status').textContent = principal.display_title + ' · ' + dataBr(principal.created_at);

    const dados = await pedirJson(base + '/runs/' + principal.id + '/jobs');
    const fluxo = $('fluxo');
    fluxo.textContent = '';
    const jobs = dados.jobs || [];
    for (const etapa of ETAPAS) {
      const job = jobs.find((j) => j.name.startsWith(etapa));
      const li = el('li');
      const st = job ? estado(job) : 'pulado';
      li.dataset.st = st;
      const nome = el('div', '', 'nome');
      nome.appendChild(el('span', ICONES[st], 'ic'));
      nome.appendChild(document.createTextNode(etapa));
      li.appendChild(nome);
      li.appendChild(el('div', job ? job.name : 'não rodou', 'det'));
      fluxo.appendChild(li);
    }
  } catch {
    ultimaConsulta = 0;
    $('e-status').textContent =
      'Não foi possível consultar o GitHub agora (sem internet ou limite de consultas). Tente de novo em instantes.';
  }
}

// ---------------------------------------------------------------- partida
$('iniciar').addEventListener('click', iniciarTeste);
$('limpar').addEventListener('click', limparHistorico);
window.addEventListener('hashchange', mostrarTela);
mostrarTela();
carregarInfo().catch(() => {});
