const fs = require('fs');

const OLD_RELEASE = '2026-09-04-base-corpo-nu-flow-estavel-284';
const NEW_RELEASE = '2026-09-04-faccoes-controlador-unificado-285';
const DUAL_VERSION = '2026-09-04-faccoes-controlador-unificado-285';
const SAIDA_VERSION = '2026-09-04-faccoes-saida-controlada-285';
const LATERAL_VERSION = '2026-09-04-faccoes-lateral-preload-285';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text, 'utf8'); }

function replaceOnce(src, from, to, label) {
  const count = src.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: esperado 1, encontrado ${count}`);
  return src.replace(from, to);
}

function replaceFunction(src, name, nextName, replacement) {
  const startToken = `  function ${name}`;
  const nextToken = `  function ${nextName}`;
  const start = src.indexOf(startToken);
  const end = src.indexOf(nextToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`Função ${name} ou próxima ${nextName} não encontrada.`);
  if (src.indexOf(startToken, start + 1) >= 0) throw new Error(`Função ${name} duplicada.`);
  return src.slice(0, start) + replacement.trimEnd() + '\n\n' + src.slice(end);
}

function replaceSection(src, startToken, endToken, replacement, label) {
  const start = src.indexOf(startToken);
  const end = src.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`${label}: limites não encontrados.`);
  return src.slice(0, start) + replacement.trimEnd() + '\n\n' + src.slice(end);
}

// ============================================================
// 1) Dual Mode passa a ser o ÚNICO controlador das três abas.
// ============================================================
let dual = read('corponu-dual-mode.js');
dual = replaceOnce(
  dual,
  'const VERSION = "2026-09-02-calcinha-necessidade-opcional-280";',
  `const VERSION = "${DUAL_VERSION}";`,
  'versão Dual Mode'
);
dual = replaceOnce(
  dual,
  '  const TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha" });',
  '  const TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha" });\n  const FACCOES_TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha", lateral_alca: "Lateral e Alça" });',
  'tipos das abas de Facções'
);
dual = replaceOnce(
  dual,
  '    refreshTimer: 0,',
  '    refreshTimer: 0,\n    faccoesRefreshTimer: 0,',
  'timer compartilhado de Facções'
);
dual = replaceOnce(
  dual,
  '      await loadProfile();\n      return state.maps;',
  '      await loadProfile();\n      if (collections.includes("movimentacoesProducao")) {\n        document.dispatchEvent(new CustomEvent("corponu:movimentacoes-atualizadas", { detail: { source: "dual-mode" } }));\n      }\n      return state.maps;',
  'evento de dados compartilhados de movimentações'
);

dual = replaceFunction(dual, 'bindTabs(pageId, tabs) {', 'makeTabs(pageId) {', `
  function bindTabs(pageId, tabs) {
    if (!tabs || tabs.dataset.corponuDualBound === "1") return;
    tabs.dataset.corponuDualBound = "1";
    tabs.addEventListener("click", event => {
      const button = event.target.closest(".corponu-dual-tab");
      const type = button?.dataset?.type || "";
      if (!type) return;
      if (pageId === "faccoes") {
        setActiveFaccoesType(type);
        return;
      }
      setActiveType(pageId, type);
    });
  }
`);

dual = replaceOnce(
  dual,
  '        <button type="button" class="corponu-dual-tab" id="abaFaccaoCorte">Lateral e Alça <span class="count" id="contCorte">0</span></button>',
  '        <button type="button" class="corponu-dual-tab" data-type="lateral_alca" id="abaFaccaoCorte">Lateral e Alça <span class="count" id="contCorte" data-count-type="lateral_alca">0</span></button>',
  'botão Lateral e Alça controlado pelo Dual Mode'
);

dual = replaceFunction(dual, 'setActiveType(pageId, type, options = {}) {', 'resetFormForType(pageId, type) {', `
  function setActiveFaccoesType(type) {
    if (!FACCOES_TYPES[type]) return;

    state.active.faccoes = type;
    const page = document.getElementById("faccoes");
    const tabs = document.querySelector('.corponu-dual-tabs[data-page="faccoes"]');
    const lateralAtiva = type === "lateral_alca";
    const painelGeral = page?.querySelector(":scope > .faccoes-operacional-panel");
    const painelLateral = document.getElementById("painelFaccoesCorte");

    if (page) page.dataset.faccaoAbaAtiva = type;
    tabs?.querySelectorAll(".corponu-dual-tab").forEach(button => {
      button.classList.toggle("active", button.dataset.type === type);
    });

    painelGeral?.classList.toggle("hidden", lateralAtiva);
    painelLateral?.classList.toggle("hidden", !lateralAtiva);

    if (lateralAtiva) window.CorpoNuFaccoesLateralAlca?.mostrar?.();
    else window.CorpoNuFaccoesLateralAlca?.ocultar?.();

    applyFaccoes();
    document.dispatchEvent(new CustomEvent("corponu:faccoes-mode", { detail: { mode: type } }));
  }

  function setActiveType(pageId, type, options = {}) {
    if (pageId === "faccoes") {
      setActiveFaccoesType(type);
      return;
    }
    if (!TYPES[type]) return;
    state.active[pageId] = type;
    const tabs = document.querySelector(`.corponu-dual-tabs[data-page="${pageId}"]`);
    tabs?.querySelectorAll(".corponu-dual-tab").forEach(button => button.classList.toggle("active", button.dataset.type === type));
    if (pageId === "produtos" || pageId === "ordens") {
      document.body.dataset.corponuFormType = type;
      if (!options.keepForm) resetFormForType(pageId, type);
      updateFormTypeUI(pageId, type);
    }
    applyPage(pageId);
  }
`);

dual = replaceFunction(dual, 'applyFaccoes() {', 'applyTracking() {', `
  function isLateralAlcaMovement(item) {
    if (!item) return false;
    if (item.fluxoFaccoes === "lateral_alca" || item.movimentacaoCorte === true) return true;
    const area = normalize([item.area, item.setor, item.areaLabel, item.setorLabel].filter(Boolean).join(" "));
    const processo = normalize(item.processo || item.servicoNome || item.processoMovimentacao);
    if (area.includes("LATERAL") || area.includes("ALCA") || area === "CORTE") return true;
    return ["LATERAL", "ALCA", "ALCAS", "CORTAGEM E MONTAGEM", "CORTAGEM MONTAGEM", "CORTE E MONTAGEM"].includes(processo);
  }

  function applyFaccoes() {
    const gerais = [...state.maps.movimentacoes.values()].filter(item => item.tipoDestino === "faccao" && !isLateralAlcaMovement(item));
    const movementCountsByType = {
      sutia: gerais.filter(item => typeOfData(item) === "sutia").length,
      calcinha: gerais.filter(item => typeOfData(item) === "calcinha").length
    };
    const lateralCount = window.CorpoNuFaccoesLateralAlca?.contagem?.();
    if (Number.isFinite(lateralCount)) movementCountsByType.lateral_alca = lateralCount;
    updateTabCounts("faccoes", movementCountsByType);

    const activeType = state.active.faccoes;
    if (activeType === "lateral_alca") {
      window.CorpoNuFaccoesLateralAlca?.render?.();
      return;
    }

    ["listaFaccoesMovimentacoes", "listaMovimentacoesUsuario"].forEach(id => {
      const tbody = document.getElementById(id);
      tbody?.querySelectorAll(":scope > tr").forEach(row => {
        if (row.querySelector(".empty") || row.cells.length <= 1) return;
        const movement = getMovementFromRow(row);
        const lateral = movement ? isLateralAlcaMovement(movement) : false;
        const type = movement ? typeOfData(movement) : "sutia";
        row.classList.toggle("corponu-dual-hidden", lateral || type !== activeType);
      });
    });

    const counts = movementCounts(activeType);
    const total = document.getElementById("faccoesOpsEmAndamento");
    const sent = document.getElementById("faccoesPecasEnviadas");
    const received = document.getElementById("faccoesPecasRecebidas");
    if (total) total.textContent = formatNumber(counts.inProgress);
    if (sent) sent.textContent = formatNumber(counts.sent);
    if (received) received.textContent = formatNumber(counts.received);
  }
`);

// O observer da tabela oficial atualiza o mapa compartilhado antes de aplicar os filtros.
dual = replaceOnce(
  dual,
  '          else if (id.includes("Faccoes") || id === "listaMovimentacoesUsuario") applyFaccoes();',
  '          else if (id.includes("Faccoes") || id === "listaMovimentacoesUsuario") {\n            clearTimeout(state.faccoesRefreshTimer);\n            state.faccoesRefreshTimer = setTimeout(() => {\n              refreshData({ collections: ["movimentacoesProducao"], serverFallback: false })\n                .catch(() => {})\n                .finally(() => applyFaccoes());\n            }, 40);\n          }',
  'sincronização compartilhada das movimentações de Facções'
);
write('corponu-dual-mode.js', dual);

// ============================================================
// 2) Lateral/Alça vira módulo de dados/tela, sem controlar abas.
//    Pré-carrega junto e mantém listener vivo mesmo escondida.
// ============================================================
let lateral = read('corponu-faccoes-lateral-alca-v2-270.js');
lateral = replaceOnce(
  lateral,
  '  const VERSION = "2026-09-03-alca-cortagem-montagem-x2-281";',
  `  const VERSION = "${LATERAL_VERSION}";`,
  'versão Lateral/Alça'
);
lateral = replaceOnce(lateral, '  let movimentosLegados = [];', '  let movimentosCompartilhados = [];', 'fonte compartilhada de movimentos');
lateral = replaceOnce(lateral, '  let carregando = false;', '  let carregando = false;\n  let carregamentoPromise = null;', 'promise única de carregamento');

lateral = replaceFunction(lateral, 'unirMovimentos() {', 'carregarLegados() {', `
  function unirMovimentos() {
    const mapa = new Map();
    [...movimentosCompartilhados, ...movimentosArea].forEach(item => {
      if (pertenceLateralAlca(item)) mapa.set(String(item.id), item);
    });
    movimentos = [...mapa.values()].sort((a, b) => momento(b) - momento(a));
  }
`);

lateral = replaceFunction(lateral, 'carregarLegados() {', 'pararListenerArea() {', `
  function hidratarMovimentosCompartilhados() {
    const mapa = window.corponuDualMode?.state?.maps?.movimentacoes;
    if (!(mapa instanceof Map)) return false;
    movimentosCompartilhados = [...mapa.values()].filter(pertenceLateralAlca);
    unirMovimentos();
    return true;
  }
`);

lateral = replaceFunction(lateral, 'carregarTudo(forcar = false) {', 'statusMovimento(item) {', `
  async function carregarTudo(forcar = false) {
    if (carregamentoPromise) {
      if (!forcar) return carregamentoPromise;
      await carregamentoPromise.catch(() => {});
    }

    carregamentoPromise = (async () => {
      const cacheValido = !forcar && carregadoEm && Date.now() - carregadoEm < CACHE_MS;
      if (cacheValido) {
        hidratarMovimentosCompartilhados();
        await iniciarListenerArea().catch(() => {});
        renderDados();
        return;
      }

      carregando = true;
      const botao = document.getElementById("btnLA2Atualizar");
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Atualizando...";
      }

      try {
        await carregarPerfil();
        if (forcar && typeof window.corponuDualMode?.refresh === "function") {
          await window.corponuDualMode.refresh().catch(error => console.warn("Atualização compartilhada de Facções falhou.", error));
        }
        hidratarMovimentosCompartilhados();
        try {
          await iniciarListenerArea();
        } catch (error) {
          const c = await contexto();
          const snap = await c.fs.getDocs(c.fs.query(
            c.fs.collection(c.db, "movimentacoesProducao"),
            c.fs.where("area", "==", AREA_LEGADA)
          ));
          movimentosArea = snap.docs.map(item => ({ id: item.id, ...item.data() })).filter(pertenceLateralAlca);
          unirMovimentos();
        }
        carregadoEm = Date.now();
        limiteRender = LIMITE_RENDER_INICIAL;
        renderDados();
      } catch (error) {
        console.error(error);
        toast("Não foi possível carregar Lateral e Alça.", "error");
      } finally {
        carregando = false;
        if (botao) {
          botao.disabled = false;
          botao.textContent = "Atualizar";
        }
      }
    })().finally(() => {
      carregamentoPromise = null;
    });

    return carregamentoPromise;
  }
`);

lateral = replaceFunction(lateral, 'renderDados() {', 'renderProcessosSaida() {', `
  function contagemMovimentos() {
    return movimentos.filter(item => !movimentoCancelado(item)).length;
  }

  function atualizarContagemAba() {
    const alvo = document.querySelector('.corponu-dual-tabs[data-page="faccoes"] [data-count-type="lateral_alca"]');
    if (alvo) alvo.textContent = contagemMovimentos().toLocaleString("pt-BR");
  }

  function renderDados() {
    atualizarContagemAba();
    preencherFiltros();
    renderResumo();
    renderTabela();
  }
`);

lateral = replaceFunction(lateral, 'mostrarArea() {', 'ocultarArea() {', `
  function mostrarArea() {
    injetarUI();
    const pagina = document.getElementById("faccoes");
    const geral = pagina?.querySelector(":scope > .faccoes-operacional-panel");
    const painel = document.getElementById("painelFaccoesCorte");
    if (!pagina || !geral || !painel) return false;
    geral.classList.add("hidden");
    painel.classList.remove("hidden");
    renderDados();
    if (!carregadoEm) carregarTudo(false).catch(() => {});
    return true;
  }
`);

lateral = replaceFunction(lateral, 'ocultarArea() {', 'iniciar() {', `
  function ocultarArea() {
    document.getElementById("painelFaccoesCorte")?.classList.add("hidden");
  }
`);

lateral = replaceFunction(lateral, 'iniciar() {', 'const api = {', `
  function iniciar() {
    injetarUI();

    document.addEventListener("corponu:movimentacoes-atualizadas", () => {
      if (!hidratarMovimentosCompartilhados()) return;
      carregadoEm = Date.now();
      renderDados();
    });

    document.addEventListener("corponu:faccoes-mode", event => {
      const modo = event.detail?.mode || "";
      if (modo === "lateral_alca") mostrarArea();
      else ocultarArea();
    });

    contexto().then(c => {
      c.onAuth(c.auth, current => {
        usuario = current;
        perfil = null;
        if (!current) {
          movimentosArea = [];
          movimentosCompartilhados = [];
          movimentos = [];
          carregadoEm = 0;
          pararListenerArea();
          renderDados();
          return;
        }
        carregarPerfil()
          .then(() => carregarTudo(false))
          .then(() => {
            if (window.corponuDualMode?.state?.active?.faccoes === "lateral_alca") mostrarArea();
          })
          .catch(error => console.warn("Pré-carga de Lateral e Alça não concluída.", error));
      });
    }).catch(error => console.warn("Lateral e Alça aguardando Firebase.", error));
  }
`);

lateral = replaceOnce(
  lateral,
  '    atualizar: carregarTudo,\n    mostrar: mostrarArea,\n    ocultar: ocultarArea,',
  '    atualizar: carregarTudo,\n    preload: () => carregarTudo(false),\n    mostrar: mostrarArea,\n    ocultar: ocultarArea,\n    render: renderDados,\n    contagem: contagemMovimentos,',
  'API pública de Lateral/Alça'
);
write('corponu-faccoes-lateral-alca-v2-270.js', lateral);

// ============================================================
// 3) Saída Sutiã/Calcinha deixa de controlar navegação/linhas.
// ============================================================
let saida = read('corponu-faccoes-tres-abas-saida.js');
saida = replaceOnce(
  saida,
  '  const V = "2026-09-04-faccoes-registrar-saida-restaurado-283";',
  `  const V = "${SAIDA_VERSION}";`,
  'versão do módulo de saída'
);
saida = replaceOnce(saida, '  const PROCESSOS_EXCLUSIVOS_CALCINHA = new Set(["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]);\n', '', 'constante antiga de filtro de Calcinha');
saida = replaceOnce(saida, '  const CLASSE_TIPO_INCOMPATIVEL = "cn230-faccao-tipo-incompativel";\n', '', 'classe antiga de filtro visual');

saida = replaceSection(
  saida,
  '  function abas() {',
  '  function estilo() {',
  `  function painelGeral() {
    return document.querySelector("#faccoes > .faccoes-operacional-panel");
  }

  function sincronizarAbaCompartilhada(modo = "") {
    const atual = modo || window.corponuDualMode?.state?.active?.faccoes || document.getElementById("faccoes")?.dataset?.faccaoAbaAtiva || "";
    if (atual !== "sutia" && atual !== "calcinha") return;
    aba = atual;
    preencherProcessos(aba);
  }`,
  'remoção do controlador concorrente de abas'
);

saida = replaceFunction(saida, 'estilo() {', 'modal() {', `
  function estilo() {
    if (document.getElementById("stFaccoes3")) return;
    const s = document.createElement("style");
    s.id = "stFaccoes3";
    s.textContent = `#faccoes:not([data-faccao-aba-ativa="sutia"]) .chegada-avisada-sutia{display:none!important}#modalSaida3.hidden{display:none!important}#modalSaida3{position:fixed;inset:0;z-index:100080;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:18px}.s3card{width:min(760px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 25px 70px #0f172a55}.s3head{display:flex;justify-content:space-between;gap:15px}.s3head h3{margin:0}.s3close{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:22px}.s3busca{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.s3grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.s3prev{margin:12px 0;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px}.s3prev.hidden,.s3campos.hidden{display:none!important}.s3info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.s3info div{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:9px}.s3info small{display:block;color:#64748b}.s3info strong{display:block;margin-top:3px}@media(max-width:760px){.s3grid,.s3info,.s3busca{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
`);

saida = replaceFunction(saida, 'preparar() {', 'abrir(a) {', `
  function preparar() {
    estilo();
    modal();
    sincronizarAbaCompartilhada();

    const ag = painelGeral()?.querySelector(":scope > .panel-header .actions") || painelGeral()?.querySelector(".panel-header .actions");
    if (ag && !document.getElementById("btnSaidaAbas")) {
      const b = document.createElement("button");
      b.id = "btnSaidaAbas";
      b.type = "button";
      b.className = "btn btn-primary";
      b.textContent = "Registrar saída";
      ag.insertBefore(b, ag.firstChild);
    }
  }
`);
saida = replaceOnce(saida, '    if (a === "corte") return;', '    if (a !== "sutia" && a !== "calcinha") return;', 'proteção do modal de saída');

saida = replaceSection(
  saida,
  '  document.addEventListener("click", e => {',
  '  document.addEventListener("submit", e => {',
  `  document.addEventListener("corponu:faccoes-mode", event => {
    sincronizarAbaCompartilhada(event.detail?.mode || "");
  });

  document.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;

    if (t.closest('.nav-btn[data-page="faccoes"]')) preparar();
    if (t.closest("#btnSaidaAbas")) abrir(aba);
    if (t.closest("#s3buscar")) pesquisar();
    if (t.closest("#s3fechar,#s3cancelar")) fechar();
  }, true);`,
  'eventos do módulo de saída sem navegação concorrente'
);
write('corponu-faccoes-tres-abas-saida.js', saida);

// ============================================================
// 4) Release/cache.
// ============================================================
const notes = 'Produção. Facções reorganizada estruturalmente com um único controlador de navegação. O Dual Mode agora é o único responsável pelas abas Sutiã, Calcinha e Lateral e Alça; o módulo Registrar saída não intercepta mais cliques, não usa stopImmediatePropagation para trocar aba e não disputa visibilidade nem filtro de linhas. Lateral e Alça passa a pré-carregar junto com os dados de Facções, aproveita o mapa compartilhado de movimentações para dados históricos, mantém seu listener vivo mesmo quando a aba fica escondida e não reinicia do zero a cada troca. A tela Lateral agora é somente dados, visualização e ações; a navegação pertence ao controlador central. Sutiã e Calcinha continuam usando a tabela geral, com Lateral/Alça excluída desse filtro. Nenhuma regra ou documento do Firebase foi alterado.';

for (const path of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(path));
  if (obj.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${obj.version}`);
  obj.version = NEW_RELEASE;
  obj.updatedAt = '2026-09-04T11:35:00-03:00';
  obj.notes = notes;
  write(path, JSON.stringify(obj, null, 2) + '\n');
}

for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let text = read(path);
  const count = text.split(OLD_RELEASE).length - 1;
  if (!count) throw new Error(`${path}: release 284 não encontrada`);
  text = text.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, text);
}

// ============================================================
// Pós-condições — falhar antes de commit se qualquer disputa restar.
// ============================================================
const finalDual = read('corponu-dual-mode.js');
const finalLateral = read('corponu-faccoes-lateral-alca-v2-270.js');
const finalSaida = read('corponu-faccoes-tres-abas-saida.js');

for (const token of [
  'const FACCOES_TYPES',
  'function setActiveFaccoesType',
  'data-type="lateral_alca"',
  'corponu:faccoes-mode',
  'corponu:movimentacoes-atualizadas',
  'isLateralAlcaMovement'
]) if (!finalDual.includes(token)) throw new Error(`Dual Mode sem ${token}`);

for (const token of [
  'movimentosCompartilhados',
  'hidratarMovimentosCompartilhados',
  'function contagemMovimentos',
  'preload: () => carregarTudo(false)',
  'render: renderDados',
  'contagem: contagemMovimentos'
]) if (!finalLateral.includes(token)) throw new Error(`Lateral/Alça sem ${token}`);

if (/function ocultarArea\(\)[\s\S]*?pararListenerArea\(\)/.test(finalLateral.slice(finalLateral.indexOf('function ocultarArea'), finalLateral.indexOf('function iniciar()')))) {
  throw new Error('Lateral/Alça ainda desliga listener ao trocar de aba');
}
if (finalLateral.includes('function carregarLegados()')) throw new Error('Consulta legada separada ainda existe');

for (const token of ['abaFaccaoCorte', 'stopImmediatePropagation()', 'CLASSE_TIPO_INCOMPATIVEL', 'corponu-dual-hidden']) {
  if (finalSaida.includes(token)) throw new Error(`Módulo de saída ainda disputa navegação/filtro: ${token}`);
}
if (!finalSaida.includes('corponu:faccoes-mode')) throw new Error('Módulo de saída não sincroniza com controlador central');

for (const path of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(path));
  if (obj.version !== NEW_RELEASE) throw new Error(`${path} fora da 285`);
}

console.log('Facções 285 organizada: controlador único, Lateral pré-carregada e sem disputa de abas.');
