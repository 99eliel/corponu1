from pathlib import Path
import json

OLD_RELEASE = "2026-09-04-base-corpo-nu-flow-estavel-284"
NEW_RELEASE = "2026-09-04-faccoes-controlador-unificado-285"
DUAL_VERSION = "2026-09-04-faccoes-controlador-unificado-285"
SAIDA_VERSION = "2026-09-04-faccoes-saida-controlada-285"
LATERAL_VERSION = "2026-09-04-faccoes-lateral-preload-285"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(src, old, new, label):
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1, encontrado {count}")
    return src.replace(old, new, 1)


def find_function_start(src, signature, start=0):
    candidates = [
        src.find(f"  function {signature}", start),
        src.find(f"  async function {signature}", start),
    ]
    candidates = [i for i in candidates if i >= 0]
    return min(candidates) if candidates else -1


def replace_function(src, signature, next_signature, replacement):
    start = find_function_start(src, signature)
    end = find_function_start(src, next_signature, start + 1)
    if start < 0 or end < 0:
        raise RuntimeError(f"Função {signature} ou próxima {next_signature} não encontrada")
    return src[:start] + replacement.rstrip() + "\n\n" + src[end:]


def replace_section(src, start_token, end_token, replacement, label):
    start = src.find(start_token)
    end = src.find(end_token, start + len(start_token))
    if start < 0 or end < 0:
        raise RuntimeError(f"{label}: limites não encontrados")
    return src[:start] + replacement.rstrip() + "\n\n" + src[end:]


# ============================================================
# 1) Dual Mode: único dono das três abas de Facções.
# ============================================================
dual = read("corponu-dual-mode.js")
dual = replace_once(
    dual,
    'const VERSION = "2026-09-02-calcinha-necessidade-opcional-280";',
    f'const VERSION = "{DUAL_VERSION}";',
    "versão Dual Mode",
)
dual = replace_once(
    dual,
    '  const TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha" });',
    '  const TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha" });\n'
    '  const FACCOES_TYPES = Object.freeze({ sutia: "Sutiã", calcinha: "Calcinha", lateral_alca: "Lateral e Alça" });',
    "tipos de Facções",
)
dual = replace_once(
    dual,
    '    refreshTimer: 0,',
    '    refreshTimer: 0,\n    faccoesRefreshTimer: 0,',
    "timer de Facções",
)
dual = replace_once(
    dual,
    '      await loadProfile();\n      return state.maps;',
    '      await loadProfile();\n'
    '      if (collections.includes("movimentacoesProducao")) {\n'
    '        document.dispatchEvent(new CustomEvent("corponu:movimentacoes-atualizadas", { detail: { source: "dual-mode" } }));\n'
    '      }\n'
    '      return state.maps;',
    "evento compartilhado de movimentações",
)

dual = replace_function(
    dual,
    "bindTabs(pageId, tabs) {",
    "makeTabs(pageId) {",
    '''  function bindTabs(pageId, tabs) {
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
  }''',
)

dual = replace_once(
    dual,
    '        <button type="button" class="corponu-dual-tab" id="abaFaccaoCorte">Lateral e Alça <span class="count" id="contCorte">0</span></button>',
    '        <button type="button" class="corponu-dual-tab" data-type="lateral_alca" id="abaFaccaoCorte">Lateral e Alça <span class="count" id="contCorte" data-count-type="lateral_alca">0</span></button>',
    "botão Lateral e Alça",
)

dual = replace_function(
    dual,
    "setActiveType(pageId, type, options = {}) {",
    "resetFormForType(pageId, type) {",
    '''  function setActiveFaccoesType(type) {
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
  }''',
)

dual = replace_function(
    dual,
    "applyFaccoes() {",
    "applyTracking() {",
    '''  function isLateralAlcaMovement(item) {
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
  }''',
)

dual = replace_once(
    dual,
    '          else if (id.includes("Faccoes") || id === "listaMovimentacoesUsuario") applyFaccoes();',
    '''          else if (id.includes("Faccoes") || id === "listaMovimentacoesUsuario") {
            clearTimeout(state.faccoesRefreshTimer);
            state.faccoesRefreshTimer = setTimeout(() => {
              refreshData({ collections: ["movimentacoesProducao"], serverFallback: false })
                .catch(() => {})
                .finally(() => applyFaccoes());
            }, 40);
          }''',
    "observer compartilhado de Facções",
)
write("corponu-dual-mode.js", dual)


# ============================================================
# 2) Lateral/Alça: dados/tela, pré-carga e listener persistente.
# ============================================================
lateral = read("corponu-faccoes-lateral-alca-v2-270.js")
lateral = replace_once(
    lateral,
    '  const VERSION = "2026-09-03-alca-cortagem-montagem-x2-281";',
    f'  const VERSION = "{LATERAL_VERSION}";',
    "versão Lateral/Alça",
)
lateral = replace_once(lateral, '  let movimentosLegados = [];', '  let movimentosCompartilhados = [];', "fonte compartilhada")
lateral = replace_once(lateral, '  let carregando = false;', '  let carregando = false;\n  let carregamentoPromise = null;', "promise de carga")

lateral = replace_function(
    lateral,
    "unirMovimentos() {",
    "carregarLegados() {",
    '''  function unirMovimentos() {
    const mapa = new Map();
    [...movimentosCompartilhados, ...movimentosArea].forEach(item => {
      if (pertenceLateralAlca(item)) mapa.set(String(item.id), item);
    });
    movimentos = [...mapa.values()].sort((a, b) => momento(b) - momento(a));
  }''',
)

lateral = replace_function(
    lateral,
    "carregarLegados() {",
    "pararListenerArea() {",
    '''  function hidratarMovimentosCompartilhados() {
    const mapa = window.corponuDualMode?.state?.maps?.movimentacoes;
    if (!(mapa instanceof Map)) return false;
    movimentosCompartilhados = [...mapa.values()].filter(pertenceLateralAlca);
    unirMovimentos();
    return true;
  }''',
)

lateral = replace_function(
    lateral,
    "carregarTudo(forcar = false) {",
    "statusMovimento(item) {",
    '''  async function carregarTudo(forcar = false) {
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
  }''',
)

lateral = replace_function(
    lateral,
    "renderDados() {",
    "renderProcessosSaida() {",
    '''  function contagemMovimentos() {
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
  }''',
)

lateral = replace_function(
    lateral,
    "mostrarArea() {",
    "ocultarArea() {",
    '''  function mostrarArea() {
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
  }''',
)

lateral = replace_function(
    lateral,
    "ocultarArea() {",
    "iniciar() {",
    '''  function ocultarArea() {
    document.getElementById("painelFaccoesCorte")?.classList.add("hidden");
  }''',
)

lateral = replace_function(
    lateral,
    "iniciar() {",
    "const api = {",
    '''  function iniciar() {
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
  }''',
)

lateral = replace_once(
    lateral,
    '    atualizar: carregarTudo,\n    mostrar: mostrarArea,\n    ocultar: ocultarArea,',
    '    atualizar: carregarTudo,\n'
    '    preload: () => carregarTudo(false),\n'
    '    mostrar: mostrarArea,\n'
    '    ocultar: ocultarArea,\n'
    '    render: renderDados,\n'
    '    contagem: contagemMovimentos,',
    "API Lateral/Alça",
)
write("corponu-faccoes-lateral-alca-v2-270.js", lateral)


# ============================================================
# 3) Saída Sutiã/Calcinha: sem controlar abas ou filtro de linhas.
# ============================================================
saida = read("corponu-faccoes-tres-abas-saida.js")
saida = replace_once(
    saida,
    '  const V = "2026-09-04-faccoes-registrar-saida-restaurado-283";',
    f'  const V = "{SAIDA_VERSION}";',
    "versão saída",
)
saida = replace_once(saida, '  const PROCESSOS_EXCLUSIVOS_CALCINHA = new Set(["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]);\n', '', "filtro antigo Calcinha")
saida = replace_once(saida, '  const CLASSE_TIPO_INCOMPATIVEL = "cn230-faccao-tipo-incompativel";\n', '', "classe filtro antiga")

saida = replace_section(
    saida,
    '  function abas() {',
    '  function estilo() {',
    '''  function painelGeral() {
    return document.querySelector("#faccoes > .faccoes-operacional-panel");
  }

  function sincronizarAbaCompartilhada(modo = "") {
    const atual = modo || window.corponuDualMode?.state?.active?.faccoes || document.getElementById("faccoes")?.dataset?.faccaoAbaAtiva || "";
    if (atual !== "sutia" && atual !== "calcinha") return;
    aba = atual;
    preencherProcessos(aba);
  }''',
    "controlador concorrente antigo",
)

saida = replace_function(
    saida,
    "estilo() {",
    "modal() {",
    '''  function estilo() {
    if (document.getElementById("stFaccoes3")) return;
    const s = document.createElement("style");
    s.id = "stFaccoes3";
    s.textContent = `#faccoes:not([data-faccao-aba-ativa="sutia"]) .chegada-avisada-sutia{display:none!important}#modalSaida3.hidden{display:none!important}#modalSaida3{position:fixed;inset:0;z-index:100080;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:18px}.s3card{width:min(760px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 25px 70px #0f172a55}.s3head{display:flex;justify-content:space-between;gap:15px}.s3head h3{margin:0}.s3close{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:22px}.s3busca{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.s3grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.s3prev{margin:12px 0;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px}.s3prev.hidden,.s3campos.hidden{display:none!important}.s3info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.s3info div{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:9px}.s3info small{display:block;color:#64748b}.s3info strong{display:block;margin-top:3px}@media(max-width:760px){.s3grid,.s3info,.s3busca{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }''',
)

saida = replace_function(
    saida,
    "preparar() {",
    "abrir(a) {",
    '''  function preparar() {
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
  }''',
)
saida = replace_once(saida, '    if (a === "corte") return;', '    if (a !== "sutia" && a !== "calcinha") return;', "proteção saída")

saida = replace_section(
    saida,
    '  document.addEventListener("click", e => {',
    '  document.addEventListener("submit", e => {',
    '''  document.addEventListener("corponu:faccoes-mode", event => {
    sincronizarAbaCompartilhada(event.detail?.mode || "");
  });

  document.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;

    if (t.closest('.nav-btn[data-page="faccoes"]')) preparar();
    if (t.closest("#btnSaidaAbas")) abrir(aba);
    if (t.closest("#s3buscar")) pesquisar();
    if (t.closest("#s3fechar,#s3cancelar")) fechar();
  }, true);''',
    "eventos concorrentes de navegação",
)
write("corponu-faccoes-tres-abas-saida.js", saida)


# ============================================================
# 4) Release/cache.
# ============================================================
notes = (
    "Produção. Facções reorganizada estruturalmente com um único controlador de navegação. "
    "O Dual Mode agora é o único responsável pelas abas Sutiã, Calcinha e Lateral e Alça; "
    "o módulo Registrar saída não intercepta mais os cliques das abas, não usa stopImmediatePropagation "
    "para trocar aba e não disputa visibilidade nem filtro de linhas. Lateral e Alça passa a pré-carregar "
    "junto com os dados de Facções, aproveita o mapa compartilhado de movimentações para histórico e mantém "
    "seu listener vivo mesmo quando a aba fica escondida, sem reiniciar do zero a cada troca. A tela Lateral "
    "agora é somente dados, visualização e ações; a navegação pertence ao controlador central. Sutiã e Calcinha "
    "continuam usando a tabela geral, com movimentações de Lateral/Alça separadas desse filtro. Nenhuma regra ou "
    "documento do Firebase foi alterado."
)

for path in ["corponu-release.json", "version.json"]:
    obj = json.loads(read(path))
    if obj.get("version") != OLD_RELEASE:
        raise RuntimeError(f"{path}: versão inesperada {obj.get('version')}")
    obj["version"] = NEW_RELEASE
    obj["updatedAt"] = "2026-09-04T11:45:00-03:00"
    obj["notes"] = notes
    write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")

for path in ["index.html", "update.js", "corponu-atualizador.js"]:
    text = read(path)
    if OLD_RELEASE not in text:
        raise RuntimeError(f"{path}: release 284 não encontrada")
    write(path, text.replace(OLD_RELEASE, NEW_RELEASE))


# ============================================================
# Pós-condições.
# ============================================================
final_dual = read("corponu-dual-mode.js")
final_lateral = read("corponu-faccoes-lateral-alca-v2-270.js")
final_saida = read("corponu-faccoes-tres-abas-saida.js")

for token in [
    "const FACCOES_TYPES",
    "function setActiveFaccoesType",
    'data-type="lateral_alca"',
    "corponu:faccoes-mode",
    "corponu:movimentacoes-atualizadas",
    "isLateralAlcaMovement",
]:
    if token not in final_dual:
        raise RuntimeError(f"Dual Mode sem {token}")

for token in [
    "movimentosCompartilhados",
    "hidratarMovimentosCompartilhados",
    "function contagemMovimentos",
    "preload: () => carregarTudo(false)",
    "render: renderDados",
    "contagem: contagemMovimentos",
]:
    if token not in final_lateral:
        raise RuntimeError(f"Lateral/Alça sem {token}")

ocultar_start = final_lateral.find("function ocultarArea()")
ocultar_end = final_lateral.find("function iniciar()", ocultar_start)
if ocultar_start < 0 or ocultar_end < 0:
    raise RuntimeError("Bloco ocultarArea não localizado no resultado")
if "pararListenerArea()" in final_lateral[ocultar_start:ocultar_end]:
    raise RuntimeError("Lateral/Alça ainda desliga listener ao trocar de aba")
if "function carregarLegados()" in final_lateral or "async function carregarLegados()" in final_lateral:
    raise RuntimeError("Consulta legada separada ainda existe")

for token in ["abaFaccaoCorte", "stopImmediatePropagation()", "CLASSE_TIPO_INCOMPATIVEL", "corponu-dual-hidden"]:
    if token in final_saida:
        raise RuntimeError(f"Módulo de saída ainda disputa navegação/filtro: {token}")
if "corponu:faccoes-mode" not in final_saida:
    raise RuntimeError("Módulo de saída não sincroniza com controlador central")

for path in ["corponu-release.json", "version.json"]:
    obj = json.loads(read(path))
    if obj.get("version") != NEW_RELEASE:
        raise RuntimeError(f"{path} fora da 285")

print("Facções 285 organizada: controlador único, Lateral pré-carregada e sem disputa de abas.")
