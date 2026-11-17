// Front-end: mede ping, download e upload e salva no histórico.
const el = (id) => document.getElementById(id);
const mbps = (bytes, ms) => (bytes * 8) / 1e6 / (ms / 1000);

async function medirPing() {
  const inicio = performance.now();
  await fetch('/api/ping', { cache: 'no-store' });
  return performance.now() - inicio;
}

async function medirDownload() {
  const inicio = performance.now();
  const resposta = await fetch('/api/download?mb=10', { cache: 'no-store' });
  const bytes = (await resposta.arrayBuffer()).byteLength;
  return mbps(bytes, performance.now() - inicio);
}

async function medirUpload() {
  const dados = new Uint8Array(5 * 1024 * 1024);
  const inicio = performance.now();
  await fetch('/api/upload', { method: 'POST', body: dados });
  return mbps(dados.length, performance.now() - inicio);
}

async function carregarHistorico() {
  const lista = await (await fetch('/api/historico')).json();
  const corpo = el('historico');
  corpo.textContent = '';
  for (const m of lista) {
    const linha = corpo.insertRow();
    [new Date(m.data).toLocaleString('pt-BR'), m.download, m.upload, m.ping].forEach((v) => {
      linha.insertCell().textContent = typeof v === 'number' ? v.toFixed(1) : v;
    });
  }
}

el('iniciar').addEventListener('click', async () => {
  el('iniciar').disabled = true;
  try {
    el('status').textContent = 'Medindo ping...';
    const ping = await medirPing();
    el('ping').textContent = ping.toFixed(1);
    el('status').textContent = 'Medindo download...';
    const download = await medirDownload();
    el('download').textContent = download.toFixed(1);
    el('status').textContent = 'Medindo upload...';
    const upload = await medirUpload();
    el('upload').textContent = upload.toFixed(1);
    await fetch('/api/historico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download, upload, ping }),
    });
    el('status').textContent = 'Concluído e salvo no histórico.';
    await carregarHistorico();
  } catch (erro) {
    el('status').textContent = 'Erro durante o teste.';
  }
  el('iniciar').disabled = false;
});

carregarHistorico();
