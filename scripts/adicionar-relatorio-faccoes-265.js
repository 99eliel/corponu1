const fs = require('fs');

const OLD = '2026-08-27-pagamentos-carregamento-estavel-264';
const NEW = '2026-08-28-faccoes-relatorio-filtrado-265';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const i = text.indexOf(search);
  if (i < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, i + search.length) >= 0) throw new Error(`Bloco duplicado: ${label}`);
  return text.slice(0, i) + replacement + text.slice(i + search.length);
}

let app = read('app.js');
let index = read('index.html');
let update = read('update.js');
let atualizador = read('corponu-atualizador.js');

// 1) Botão nativo dentro do mesmo bloco de filtros da aba Facções.
index = replaceOnce(
  index,
  '            <button class="btn" id="btnLimparFiltrosFaccaoMovimentacoes" type="button">Limpar filtros</button>',
  '            <button class="btn" id="btnLimparFiltrosFaccaoMovimentacoes" type="button">Limpar filtros</button>\n            <button class="btn btn-print" id="btnImprimirRelatorioFaccoes" type="button">Imprimir relatório</button>',
  'botão imprimir relatório Facções'
);

// 2) Um único filtro canônico alimenta tanto a tela quanto a impressão.
const markerLimpar = 'function limparFiltrosFaccoesMovimentacoes() {';
const helpers = `function ehMovimentacaoCalcinhaFaccoes(mov) {
  const contexto = normalizarTexto([mov?.area, mov?.setor, mov?.areaLabel, mov?.setorLabel].filter(Boolean).join(" "));
  if (contexto.includes("calcinha")) return true;

  const processo = normalizarTexto(mov?.processo || "");
  return processo.includes("calcinha");
}

function getAbaAtivaFaccoesRelatorio() {
  const aba = String(document.getElementById("faccoes")?.dataset?.faccaoAbaAtiva || "").trim().toLowerCase();
  return ["sutia", "calcinha"].includes(aba) ? aba : "";
}

function filtrarMovimentacoesFaccoes(movimentosBase, filtros, opcoes = {}) {
  let movimentos = (movimentosBase || []).filter(mov => {
    const status = mov.status || "em_andamento";
    const dataFiltro = getDataMovimentacaoFaccoes(mov, filtros.tipoData);

    const texto = normalizarTexto([
      mov.numeroOP,
      mov.referencia,
      mov.cor,
      mov.destino,
      mov.processo,
      status,
      labelStatusMovimento(status),
      mov.dataEnvio,
      mov.dataChegada,
      ehMovimentacaoSutiaFaccoes(mov) && situacaoChegadaFaccoes(mov) === "avisada" ? "chegada avisada aguardando baixa" : "",
      mov.chegadaInformadaPorNome,
      mov.chegadaInformadaData
    ].join(" "));

    if (filtros.busca && !texto.includes(filtros.busca)) return false;
    if (filtros.faccao && String(mov.destino || "") !== filtros.faccao) return false;
    if (filtros.processo && String(mov.processo || "") !== filtros.processo) return false;
    if (filtros.status && status !== filtros.status) return false;
    if (filtros.chegada && situacaoChegadaFaccoes(mov) !== filtros.chegada) return false;
    if (filtros.dataInicio && (!dataFiltro || dataFiltro < filtros.dataInicio)) return false;
    if (filtros.dataFim && (!dataFiltro || dataFiltro > filtros.dataFim)) return false;

    return true;
  });

  if (opcoes.respeitarAbaAtiva === true) {
    const aba = getAbaAtivaFaccoesRelatorio();
    if (aba === "sutia") movimentos = movimentos.filter(ehMovimentacaoSutiaFaccoes);
    if (aba === "calcinha") movimentos = movimentos.filter(ehMovimentacaoCalcinhaFaccoes);
  }

  return movimentos;
}

function labelSituacaoChegadaFaccoes(valor) {
  const mapa = {
    nao_avisada: "Não avisada",
    avisada: "Avisada • aguardando baixa",
    confirmada: "Baixa confirmada"
  };
  return mapa[String(valor || "")] || "-";
}

function textoSelectFaccoesRelatorio(id, fallback = "") {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLSelectElement)) return fallback;
  return String(el.options?.[el.selectedIndex]?.textContent || el.value || fallback).trim();
}

function getTextoFiltrosFaccoesRelatorio(filtros) {
  const itens = [];
  const aba = getAbaAtivaFaccoesRelatorio();
  if (aba) itens.push(\`Aba: \${aba === "sutia" ? "Sutiã" : "Calcinha"}\`);

  const busca = document.getElementById("buscaFaccaoMovimentacoes")?.value?.trim();
  if (busca) itens.push(\`Busca: \${busca}\`);
  if (filtros.faccao) itens.push(\`Facção: \${textoSelectFaccoesRelatorio("faccaoMovFiltroNome", filtros.faccao)}\`);
  if (filtros.processo) itens.push(\`Processo: \${textoSelectFaccoesRelatorio("faccaoMovFiltroProcesso", filtros.processo)}\`);
  if (filtros.status) itens.push(\`Status: \${textoSelectFaccoesRelatorio("faccaoMovFiltroStatus", filtros.status)}\`);
  if (filtros.chegada) itens.push(\`Chegada: \${textoSelectFaccoesRelatorio("faccaoMovFiltroChegada", filtros.chegada)}\`);

  itens.push(\`Data considerada: \${textoSelectFaccoesRelatorio("faccaoMovFiltroDataTipo", filtros.tipoData === "chegada" ? "Data de chegada" : "Data de envio")}\`);

  if (filtros.dataInicio || filtros.dataFim) {
    const inicio = filtros.dataInicio ? dataISOParaBR(filtros.dataInicio) : "início";
    const fim = filtros.dataFim ? dataISOParaBR(filtros.dataFim) : "hoje";
    itens.push(\`Período: \${inicio} até \${fim}\`);
  }

  return itens.length ? itens.join(" | ") : "Todas as movimentações de facção";
}

function imprimirRelatorioFaccoesFiltrado() {
  const movimentosBase = state.movimentacoesProducao.filter(mov => mov.tipoDestino === "faccao");
  const filtros = getFiltrosFaccoesMovimentacoes();
  const movimentos = filtrarMovimentacoesFaccoes(movimentosBase, filtros, { respeitarAbaAtiva: true });

  if (!movimentos.length) {
    toast("Nenhuma movimentação filtrada para imprimir.");
    return;
  }

  const totalEnviadas = movimentos.reduce((soma, mov) => soma + Number(mov.quantidadeEnviada || 0), 0);
  const totalRecebidas = movimentos.reduce((soma, mov) => soma + Number(quantidadeRecebidaMovimentacao(mov) || 0), 0);
  const totalFalta = movimentos.reduce((soma, mov) => soma + Number(mov.falta || 0), 0);
  const descontoDefeito = movimentos.reduce((soma, mov) => soma + Number(mov.descontoDefeito ?? mov.defeito ?? 0), 0);
  const emAberto = movimentos.filter(mov => (mov.status || "em_andamento") === "em_andamento").length;
  const retornadas = movimentos.filter(mov => ["retornou", "encaminhado", "finalizado"].includes(mov.status)).length;
  const avisadas = movimentos.filter(mov => situacaoChegadaFaccoes(mov) === "avisada").length;
  const filtrosTexto = getTextoFiltrosFaccoesRelatorio(filtros);
  const dataImpressao = new Date().toLocaleString("pt-BR");

  const linhas = movimentos.map(mov => \`
    <tr>
      <td><strong>\${escapeHtml(mov.numeroOP || "-")}</strong></td>
      <td>\${escapeHtml(mov.referencia || "-")}</td>
      <td>\${escapeHtml(mov.cor || "-")}</td>
      <td>\${escapeHtml(mov.destino || "-")}</td>
      <td>\${escapeHtml(mov.processo || "-")}</td>
      <td class="num">\${escapeHtml(Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR"))}</td>
      <td class="num">\${escapeHtml(Number(quantidadeRecebidaMovimentacao(mov) || 0).toLocaleString("pt-BR"))}</td>
      <td>\${escapeHtml(dataISOParaBR(mov.dataEnvio) || mov.dataEnvio || "-")}</td>
      <td>\${escapeHtml(dataISOParaBR(mov.dataChegada) || mov.dataChegada || "-")}</td>
      <td class="num">\${escapeHtml(Number(mov.falta || 0).toLocaleString("pt-BR"))}</td>
      <td class="num">\${escapeHtml(formatarMoedaBR(mov.descontoDefeito ?? mov.defeito ?? 0))}</td>
      <td>\${escapeHtml(labelStatusMovimento(mov.status))}</td>
      <td>\${escapeHtml(labelSituacaoChegadaFaccoes(situacaoChegadaFaccoes(mov)))}</td>
    </tr>
  \`).join("");

  const htmlImpressao = \`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório de Facções</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 18px; font-size: 10.5px; }
          .print-header { display:flex; justify-content:space-between; gap:16px; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px; }
          h1 { margin:0 0 4px; font-size:20px; }
          .muted { color:#475569; font-size:10.5px; }
          .filter-box { border:1px solid #cbd5e1; border-radius:8px; padding:9px; margin-bottom:12px; background:#f8fafc; line-height:1.45; }
          .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin:12px 0; }
          .summary div { border:1px solid #cbd5e1; border-radius:8px; padding:8px; min-height:54px; }
          .summary span { display:block; color:#475569; font-size:9px; text-transform:uppercase; font-weight:700; }
          .summary strong { display:block; font-size:14px; margin-top:4px; }
          table { width:100%; border-collapse:collapse; table-layout:auto; }
          th, td { border:1px solid #cbd5e1; padding:4px 5px; vertical-align:top; }
          th { background:#eef2ff; text-align:left; font-size:9px; }
          .num { text-align:right; font-weight:700; white-space:nowrap; }
          @page { size: landscape; margin: 7mm; }
          @media print { body { margin:0; } thead { display:table-header-group; } tr { break-inside:avoid; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            <h1>Relatório de Facções</h1>
            <div class="muted">OP Confecção • Movimentações filtradas</div>
          </div>
          <div class="muted">Impresso em:<br><strong>\${escapeHtml(dataImpressao)}</strong></div>
        </div>

        <div class="filter-box"><strong>Filtros aplicados:</strong><br>\${escapeHtml(filtrosTexto)}</div>

        <div class="summary">
          <div><span>Movimentações / OPs</span><strong>\${movimentos.length.toLocaleString("pt-BR")}</strong></div>
          <div><span>Peças enviadas</span><strong>\${totalEnviadas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Peças recebidas</span><strong>\${totalRecebidas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Falta</span><strong>\${totalFalta.toLocaleString("pt-BR")}</strong></div>
          <div><span>Em aberto</span><strong>\${emAberto.toLocaleString("pt-BR")}</strong></div>
          <div><span>Retornadas / encaminhadas</span><strong>\${retornadas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Avisadas aguardando baixa</span><strong>\${avisadas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Desconto por defeito</span><strong>\${escapeHtml(formatarMoedaBR(descontoDefeito))}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>OP</th><th>REF</th><th>Cor</th><th>Facção</th><th>Processo</th><th>Enviada</th><th>Recebida</th>
              <th>Envio</th><th>Chegada</th><th>Falta</th><th>Desc. defeito</th><th>Status</th><th>Situação chegada</th>
            </tr>
          </thead>
          <tbody>\${linhas}</tbody>
        </table>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        <\/script>
      </body>
    </html>
  \`;

  const janela = window.open("", "_blank");
  if (!janela) {
    toast("O navegador bloqueou a impressão. Permita pop-ups para este site.");
    return;
  }

  janela.document.open();
  janela.document.write(htmlImpressao);
  janela.document.close();
}

`;

if (!app.includes(markerLimpar)) throw new Error('Marcador de filtros Facções não encontrado');
if (app.includes('function imprimirRelatorioFaccoesFiltrado()')) throw new Error('Relatório de Facções já existe');
app = app.replace(markerLimpar, helpers + markerLimpar);

const filtroInlineAntigo = `  const filtros = getFiltrosFaccoesMovimentacoes();
  let movimentos = movimentosBase.filter(mov => {
    const status = mov.status || "em_andamento";
    const dataFiltro = getDataMovimentacaoFaccoes(mov, filtros.tipoData);

    const texto = normalizarTexto([
      mov.numeroOP,
      mov.referencia,
      mov.cor,
      mov.destino,
      mov.processo,
      status,
      labelStatusMovimento(status),
      mov.dataEnvio,
      mov.dataChegada,
      ehMovimentacaoSutiaFaccoes(mov) && situacaoChegadaFaccoes(mov) === "avisada" ? "chegada avisada aguardando baixa" : "",
      mov.chegadaInformadaPorNome,
      mov.chegadaInformadaData
    ].join(" "));

    if (filtros.busca && !texto.includes(filtros.busca)) return false;
    if (filtros.faccao && String(mov.destino || "") !== filtros.faccao) return false;
    if (filtros.processo && String(mov.processo || "") !== filtros.processo) return false;
    if (filtros.status && status !== filtros.status) return false;
    if (filtros.chegada && situacaoChegadaFaccoes(mov) !== filtros.chegada) return false;
    if (filtros.dataInicio && (!dataFiltro || dataFiltro < filtros.dataInicio)) return false;
    if (filtros.dataFim && (!dataFiltro || dataFiltro > filtros.dataFim)) return false;

    return true;
  });`;

app = replaceOnce(
  app,
  filtroInlineAntigo,
  `  const filtros = getFiltrosFaccoesMovimentacoes();\n  let movimentos = filtrarMovimentacoesFaccoes(movimentosBase, filtros);`,
  'filtro canônico Facções'
);

const blocoLimparListener = `  const limparFiltrosFaccaoMov = document.getElementById("btnLimparFiltrosFaccaoMovimentacoes");
  if (limparFiltrosFaccaoMov) {
    limparFiltrosFaccaoMov.addEventListener("click", () => {
      limparFiltrosFaccoesMovimentacoes();
      renderFaccoesMovimentacoes();
    });
  }`;

app = replaceOnce(
  app,
  blocoLimparListener,
  `${blocoLimparListener}\n\n  const imprimirRelatorioFaccoes = document.getElementById("btnImprimirRelatorioFaccoes");\n  if (imprimirRelatorioFaccoes) {\n    imprimirRelatorioFaccoes.addEventListener("click", imprimirRelatorioFaccoesFiltrado);\n  }`,
  'listener impressão Facções'
);

// 3) Versionamento/cache.
for (const [path, texto] of [['index.html', index], ['update.js', update], ['corponu-atualizador.js', atualizador]]) {
  if (!texto.includes(OLD)) throw new Error(`Versão anterior não encontrada em ${path}`);
}
index = index.split(OLD).join(NEW);
update = update.split(OLD).join(NEW);
atualizador = atualizador.split(OLD).join(NEW);

const release = {
  version: NEW,
  updatedAt: '2026-08-28T11:24:00-03:00',
  notes: 'Produção. A aba Facções ganhou impressão de relatório baseada no mesmo filtro canônico usado pela tabela. O relatório respeita busca, facção, processo, status, situação de chegada, tipo de data, período e a subaba ativa Sutiã/Calcinha. A impressão traz resumo com movimentações, peças enviadas e recebidas, faltas, abertas, retornadas/encaminhadas, chegadas avisadas aguardando baixa e desconto por defeito, seguido de todos os itens filtrados. A impressão usa state.movimentacoesProducao já carregado e não cria consultas, listeners ou observers no Firebase.'
};
const version = {
  version: NEW,
  updatedAt: '2026-08-28T11:24:00-03:00',
  notes: 'Facções agora imprime resumo e todos os itens do filtro atual, respeitando também Sutiã/Calcinha.'
};

write('app.js', app);
write('index.html', index);
write('update.js', update);
write('corponu-atualizador.js', atualizador);
write('corponu-release.json', JSON.stringify(release, null, 2) + '\n');
write('version.json', JSON.stringify(version, null, 2) + '\n');

// Pós-condições locais.
const appFinal = read('app.js');
const indexFinal = read('index.html');
if (!appFinal.includes('function filtrarMovimentacoesFaccoes(')) throw new Error('Filtro canônico não criado');
if (!appFinal.includes('function imprimirRelatorioFaccoesFiltrado()')) throw new Error('Função de impressão não criada');
if (!appFinal.includes('respeitarAbaAtiva: true')) throw new Error('Subaba ativa não está sendo respeitada');
if (!indexFinal.includes('id="btnImprimirRelatorioFaccoes"')) throw new Error('Botão de impressão não criado');
if (appFinal.includes(filtroInlineAntigo)) throw new Error('Filtro duplicado permaneceu no render');
console.log('Relatório filtrado de Facções 265 aplicado com sucesso.');
