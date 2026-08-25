(() => {
  "use strict";

  const VERSION = "2026-08-25-manejo-calcinha-filtros-253";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FILTROS_253__";
  const ROOT_ID = "corponuManejoCalcinhaDedicado252";
  const STYLE_ID = "corponuManejoCalcinhaDedicado253Style";
  const DATALIST_ID = "corponuManejoCalcinhaFases253";
  const PAGE_SIZE = 80;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const drafts = new Map();
  const fasesSelecionadas = new Set();
  let limite = PAGE_SIZE;
  let renderAgendado = false;
  let salvando = new Set();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapeHtml = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function dual() {
    return window.corponuDualMode?.state || null;
  }

  function calcinhaAtiva() {
    const pagina = document.querySelector(".page.active")?.id || "";
    const tab = document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]');
    return pagina === "manejo" && Boolean(tab);
  }

  function tipoCalcinha(op) {
    if (!op) return false;
    const tipo = normalizar(op.tipoPeca || op.tipoPecaPadrao || op.setor || op.setorLabel);
    if (tipo.includes("CALCINHA")) return true;
    const processo = normalizar(op.processo || op.processoPlanejado || op.manejosSetores?.calcinha?.processo);
    if (processo.startsWith("CALCINHA")) return true;
    const descricao = normalizar([
      op.tipoPecaLabel,
      op.produtoNome,
      op.observacoes,
      op.pendencia
    ].join(" "));
    return descricao.includes("CALCINHA") || Boolean(op.manejosSetores?.calcinha);
  }

  function labelLinha(valor) {
    const v = normalizar(valor).replace(/\s+/g, "_");
    if (["COTTON_LINE", "COTTON__LINE"].includes(v)) return "Cotton Line";
    if (v === "CORPO_NU") return "Corpo Nu";
    return "";
  }

  function valorLinha(valor) {
    const label = labelLinha(valor);
    if (label === "Cotton Line") return "cotton_line";
    if (label === "Corpo Nu") return "corpo_nu";
    return "";
  }

  function manejo(op) {
    return op?.manejosSetores?.calcinha || {};
  }

  function necessidadeDaOp(op) {
    const m = manejo(op);
    if (op?.necessidadeManual === true) {
      return texto(op.necessidadeTexto ?? op.necessidade ?? "");
    }
    return texto(
      m.necessidadeTexto ??
      m.necessidade ??
      op?.necessidadeTexto ??
      op?.necessidade ??
      op?.necessidadeOriginal ??
      ""
    );
  }

  function valoresDaOp(op) {
    const m = manejo(op);
    const draft = drafts.get(String(op?.id || ""));
    return {
      linha: draft?.linha ?? valorLinha(m.linhaCalcinha || op?.linhaCalcinha || ""),
      fase: draft?.fase ?? texto(m.fase || op?.fase || op?.manejo?.fase || ""),
      necessidade: draft?.necessidade ?? necessidadeDaOp(op)
    };
  }

  function statusDaOp(op) {
    const m = manejo(op);
    return texto(op?.manejoStatusSetores?.calcinha || m.status || "pendente").toLowerCase();
  }

  function movimentoAtivo(opId) {
    const mapa = dual()?.maps?.movimentacoes;
    if (!(mapa instanceof Map)) return false;
    return [...mapa.values()].some(item => {
      if (String(item?.opId || "") !== String(opId || "")) return false;
      if (String(item?.tipoDestino || "") !== "faccao") return false;
      if (!tipoCalcinha(item)) return false;
      return !["finalizado", "retornou", "encaminhado"].includes(String(item?.status || "").toLowerCase());
    });
  }

  function ordensCalcinha() {
    const mapa = dual()?.maps?.ordens;
    if (!(mapa instanceof Map)) return [];
    return [...mapa.values()]
      .filter(op => op && !op.ocultarDoManejo && tipoCalcinha(op));
  }

  function numeroOrdenacao(op) {
    const n = Number(String(op?.numeroOP || "").replace(/\D/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function fasesDisponiveis(ordens) {
    const fases = new Map();
    const adicionar = valor => {
      const bruto = texto(valor);
      const chave = normalizar(bruto);
      if (bruto && chave && !fases.has(chave)) fases.set(chave, bruto);
    };

    ordens.forEach(op => adicionar(manejo(op).fase || op?.fase || op?.manejo?.fase));
    document.querySelectorAll("#manejoFasesList option").forEach(option => adicionar(option.value || option.textContent));
    try {
      const extras = JSON.parse(localStorage.getItem("fasesManejoExtras") || "[]");
      if (Array.isArray(extras)) extras.forEach(adicionar);
    } catch (_) {}

    return [...fases.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body[data-corponu-calcinha-dedicado="1"] #manejo .manejo-inline-table{display:none!important}
      body[data-corponu-calcinha-dedicado="1"] #manejo #buscaManejoLinha{display:none!important}
      #${ROOT_ID}{display:none;margin-top:14px}
      body[data-corponu-calcinha-dedicado="1"] #${ROOT_ID}{display:block}
      #${ROOT_ID} *{box-sizing:border-box}
      #${ROOT_ID} .cn252-topo{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:12px;padding:14px 16px;border:1px solid #ddd6fe;border-radius:12px;background:#faf8ff}
      #${ROOT_ID} .cn252-topo h4{margin:0 0 4px;font-size:16px;color:#1e1b4b}
      #${ROOT_ID} .cn252-topo p{margin:0;color:#64748b;font-size:12px;line-height:1.45}
      #${ROOT_ID} .cn252-contador{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:800}
      #${ROOT_ID} .cn252-filtros{display:grid;grid-template-columns:minmax(220px,2fr) minmax(145px,1fr) minmax(210px,1.35fr) minmax(155px,1fr) auto;gap:8px;margin-bottom:8px}
      #${ROOT_ID} input,#${ROOT_ID} select{width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;background:#fff;color:#0f172a;font:inherit}
      #${ROOT_ID} input:focus,#${ROOT_ID} select:focus{outline:2px solid rgba(124,58,237,.18);border-color:#7c3aed}
      #${ROOT_ID} button{font:inherit}
      #${ROOT_ID} .cn252-btn{min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;background:#fff;color:#334155;font-weight:800;cursor:pointer}
      #${ROOT_ID} .cn252-btn:hover{background:#f8fafc}
      #${ROOT_ID} .cn252-btn.salvar{border-color:#16a34a;background:#16a34a;color:#fff}
      #${ROOT_ID} .cn252-btn.enviar{border-color:#7c3aed;background:#7c3aed;color:#fff}
      #${ROOT_ID} .cn252-btn:disabled{opacity:.58;cursor:not-allowed}
      #${ROOT_ID} .cn252-lista{display:grid;gap:9px}
      #${ROOT_ID} .cn252-op{display:grid;grid-template-columns:minmax(160px,1.15fr) 90px minmax(145px,1fr) minmax(170px,1.2fr) minmax(190px,1.45fr) auto;gap:8px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}
      #${ROOT_ID} .cn252-op:hover{border-color:#c4b5fd;box-shadow:0 3px 12px rgba(15,23,42,.05)}
      #${ROOT_ID} .cn252-ident strong{display:block;font-size:14px;color:#0f172a}
      #${ROOT_ID} .cn252-ident span{display:block;margin-top:2px;color:#64748b;font-size:11px;line-height:1.35}
      #${ROOT_ID} .cn252-qtd{font-weight:900;text-align:center;color:#334155}
      #${ROOT_ID} .cn253-fase-filtro{position:relative}
      #${ROOT_ID} .cn253-fase-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left}
      #${ROOT_ID} .cn253-fase-menu{display:none;position:absolute;z-index:30;top:calc(100% + 5px);left:0;width:min(360px,90vw);padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.16)}
      #${ROOT_ID} .cn253-fase-filtro.aberto .cn253-fase-menu{display:block}
      #${ROOT_ID} .cn253-fase-menu-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:11px;font-weight:900;color:#475569}
      #${ROOT_ID} .cn253-fase-opcoes{display:grid;gap:3px;max-height:250px;overflow:auto}
      #${ROOT_ID} .cn253-fase-opcao{display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px;cursor:pointer;color:#334155;font-size:12px}
      #${ROOT_ID} .cn253-fase-opcao:hover{background:#f8fafc}
      #${ROOT_ID} .cn253-fase-opcao input{width:auto;min-height:0;margin:0;accent-color:#7c3aed}
      #${ROOT_ID} .cn253-fase-chips{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;min-height:0}
      #${ROOT_ID} .cn253-fase-chips:empty{display:none}
      #${ROOT_ID} .cn253-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #c4b5fd;border-radius:999px;padding:4px 8px;background:#f5f3ff;color:#5b21b6;font-size:11px;font-weight:800}
      #${ROOT_ID} .cn253-chip button{border:0;background:transparent;color:inherit;padding:0;cursor:pointer;font-weight:900}
      #${ROOT_ID} .cn253-filtro-acoes{display:flex;gap:6px}
      #${ROOT_ID} .cn252-acoes{display:flex;gap:6px;justify-content:flex-end}
      #${ROOT_ID} .cn252-status{display:inline-flex;margin-top:5px;padding:3px 7px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:900;text-transform:uppercase}
      #${ROOT_ID} .cn252-status.bipado{background:#dcfce7;color:#166534}
      #${ROOT_ID} .cn252-status.pendente{background:#fef3c7;color:#92400e}
      #${ROOT_ID} .cn252-vazio{padding:28px 16px;text-align:center;border:1px dashed #cbd5e1;border-radius:11px;color:#64748b;background:#f8fafc}
      #${ROOT_ID} .cn252-mais{display:flex;justify-content:center;margin-top:12px}
      #${ROOT_ID} .cn252-msg{min-height:18px;margin-top:8px;color:#64748b;font-size:11px}
      #${ROOT_ID} .cn252-msg.ok{color:#15803d;font-weight:800}
      #${ROOT_ID} .cn252-msg.erro{color:#b91c1c;font-weight:800}
      @media (max-width:1180px){#${ROOT_ID} .cn252-op{grid-template-columns:1.2fr 85px 1fr 1fr 1.3fr auto}#${ROOT_ID} .cn252-acoes{grid-column:auto}}
      @media (max-width:820px){#${ROOT_ID} .cn252-filtros{grid-template-columns:1fr 1fr}#${ROOT_ID} .cn252-op{grid-template-columns:1fr 1fr}#${ROOT_ID} .cn252-ident{grid-column:1/-1}#${ROOT_ID} .cn252-qtd{text-align:left}#${ROOT_ID} .cn252-acoes{grid-column:1/-1;justify-content:stretch}#${ROOT_ID} .cn252-acoes .cn252-btn{flex:1}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function garantirEstrutura() {
    const manejoPage = document.getElementById("manejo");
    const tabela = manejoPage?.querySelector(".manejo-inline-table");
    if (!manejoPage || !tabela) return null;

    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("section");
      root.id = ROOT_ID;
      root.setAttribute("aria-label", "Manejo Calcinha dedicado");
      const wrapperTabela = tabela.closest(".table-wrap") || tabela;
      wrapperTabela.parentElement?.insertBefore(root, wrapperTabela);
      root.innerHTML = `
        <div class="cn252-topo">
          <div>
            <h4>Manejo Calcinha</h4>
            <p>Tela própria da Calcinha. Linha, Fase e Necessidade são salvas diretamente na OP. A facção é escolhida livremente somente no momento do envio.</p>
          </div>
          <span class="cn252-contador" id="cn252Contador">0 OPs</span>
        </div>
        <div class="cn252-filtros">
          <input id="cn252Busca" type="search" autocomplete="off" placeholder="Buscar OP, referência, cor, fase ou necessidade...">
          <select id="cn252FiltroLinha">
            <option value="">Todas as linhas</option>
            <option value="cotton_line">Cotton Line</option>
            <option value="corpo_nu">Corpo Nu</option>
            <option value="sem_linha">A definir</option>
          </select>
          <div class="cn253-fase-filtro" id="cn253FaseFiltro">
            <button type="button" class="cn252-btn cn253-fase-toggle" data-acao="toggle-fases"><span id="cn253FaseResumo">Todas as fases</span><span>▾</span></button>
            <div class="cn253-fase-menu">
              <div class="cn253-fase-menu-topo"><span>Selecione uma ou mais fases</span><button type="button" class="cn252-btn" data-acao="limpar-fases">Limpar</button></div>
              <div class="cn253-fase-opcoes" id="cn253FaseOpcoes"></div>
            </div>
          </div>
          <select id="cn252FiltroStatus">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="organizada">Organizada</option>
            <option value="bipado">Bipado</option>
          </select>
          <div class="cn253-filtro-acoes">
            <button type="button" class="cn252-btn" id="cn252Atualizar">Atualizar</button>
            <button type="button" class="cn252-btn" data-acao="limpar-filtros">Limpar filtros</button>
          </div>
          <div class="cn253-fase-chips" id="cn253FaseChips"></div>
        </div>
        <datalist id="${DATALIST_ID}"></datalist>
        <div class="cn252-lista" id="cn252Lista"></div>
        <div class="cn252-mais" id="cn252MaisWrap"></div>
        <div class="cn252-msg" id="cn252Msg" aria-live="polite"></div>
      `;
      instalarEventosRoot(root);
    }
    return root;
  }

  function filtros() {
    return {
      busca: normalizar(document.getElementById("cn252Busca")?.value),
      linha: texto(document.getElementById("cn252FiltroLinha")?.value),
      status: texto(document.getElementById("cn252FiltroStatus")?.value),
      fases: [...fasesSelecionadas]
    };
  }

  function filtrarOrdens(ordens) {
    const f = filtros();
    return ordens.filter(op => {
      const v = valoresDaOp(op);
      if (f.linha === "sem_linha" && v.linha) return false;
      if (f.linha && f.linha !== "sem_linha" && v.linha !== f.linha) return false;
      if (f.status && statusDaOp(op) !== f.status) return false;
      if (f.fases.length && !f.fases.includes(normalizar(v.fase))) return false;
      if (f.busca) {
        const palheiro = normalizar([
          op.numeroOP,
          op.referencia,
          op.cor,
          op.produtoNome,
          v.fase,
          v.necessidade
        ].join(" "));
        if (!palheiro.includes(f.busca)) return false;
      }
      return true;
    }).sort((a, b) => numeroOrdenacao(b) - numeroOrdenacao(a));
  }

  function statusLabel(status) {
    const s = String(status || "pendente").toLowerCase();
    if (s === "bipado") return "Bipado";
    if (s === "organizada") return "Organizada";
    return "Pendente";
  }

  function atualizarFiltroFases(fases) {
    const opcoes = document.getElementById("cn253FaseOpcoes");
    const resumo = document.getElementById("cn253FaseResumo");
    const chips = document.getElementById("cn253FaseChips");
    const mapa = new Map(fases.map(fase => [normalizar(fase), fase]));

    [...fasesSelecionadas].forEach(chave => {
      if (!mapa.has(chave)) fasesSelecionadas.delete(chave);
    });

    if (opcoes) {
      opcoes.innerHTML = fases.length
        ? fases.map(fase => {
            const chave = normalizar(fase);
            const checked = fasesSelecionadas.has(chave) ? "checked" : "";
            return `<label class="cn253-fase-opcao"><input type="checkbox" data-filtro-fase="${escapeHtml(chave)}" ${checked}><span>${escapeHtml(fase)}</span></label>`;
          }).join("")
        : '<div class="cn252-vazio">Nenhuma fase cadastrada.</div>';
    }

    if (resumo) {
      resumo.textContent = fasesSelecionadas.size
        ? `${fasesSelecionadas.size} fase${fasesSelecionadas.size === 1 ? "" : "s"} selecionada${fasesSelecionadas.size === 1 ? "" : "s"}`
        : "Todas as fases";
    }

    if (chips) {
      chips.innerHTML = [...fasesSelecionadas]
        .map(chave => mapa.has(chave)
          ? `<span class="cn253-chip">${escapeHtml(mapa.get(chave))}<button type="button" data-acao="remover-fase" data-fase="${escapeHtml(chave)}" aria-label="Remover fase">×</button></span>`
          : "")
        .join("");
    }
  }

  function limparFiltros() {
    const busca = document.getElementById("cn252Busca");
    const linha = document.getElementById("cn252FiltroLinha");
    const status = document.getElementById("cn252FiltroStatus");
    if (busca) busca.value = "";
    if (linha) linha.value = "";
    if (status) status.value = "";
    fasesSelecionadas.clear();
    limite = PAGE_SIZE;
    document.getElementById("cn253FaseFiltro")?.classList.remove("aberto");
    agendarRender();
  }

  function montarOp(op) {
    const id = String(op.id || "");
    const v = valoresDaOp(op);
    const status = statusDaOp(op);
    const emMovimento = movimentoAtivo(id);
    const ocupado = salvando.has(id);

    return `
      <article class="cn252-op" data-cn252-op="${escapeHtml(id)}">
        <div class="cn252-ident">
          <strong>OP ${escapeHtml(op.numeroOP || "-")}</strong>
          <span>REF ${escapeHtml(op.referencia || "-")} • ${escapeHtml(op.cor || "-")}</span>
          <span class="cn252-status ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
        </div>
        <div class="cn252-qtd">${Number(op.quantidade || 0).toLocaleString("pt-BR")}</div>
        <select data-campo="linha" aria-label="Linha da OP ${escapeHtml(op.numeroOP || "")}">
          <option value="">A definir</option>
          <option value="cotton_line" ${v.linha === "cotton_line" ? "selected" : ""}>Cotton Line</option>
          <option value="corpo_nu" ${v.linha === "corpo_nu" ? "selected" : ""}>Corpo Nu</option>
        </select>
        <input data-campo="fase" type="text" list="${DATALIST_ID}" autocomplete="off" value="${escapeHtml(v.fase)}" placeholder="Fase">
        <input data-campo="necessidade" type="text" autocomplete="off" value="${escapeHtml(v.necessidade)}" placeholder="Necessidade livre">
        <div class="cn252-acoes">
          <button type="button" class="cn252-btn salvar" data-acao="salvar" ${ocupado ? "disabled" : ""}>${ocupado ? "Salvando..." : "Salvar"}</button>
          <button type="button" class="cn252-btn enviar" data-acao="enviar" ${ocupado || emMovimento ? "disabled" : ""}>${emMovimento ? "Em facção" : "Enviar"}</button>
        </div>
      </article>
    `;
  }

  function render() {
    renderAgendado = false;
    injetarEstilo();
    const root = garantirEstrutura();
    if (!root) return;

    const ativa = calcinhaAtiva();
    document.body?.toggleAttribute("data-corponu-calcinha-dedicado", ativa);
    if (!ativa) return;
    if (document.body) document.body.dataset.corponuCalcinhaDedicado = "1";

    const todas = ordensCalcinha();
    const fases = fasesDisponiveis(todas);
    const datalist = document.getElementById(DATALIST_ID);
    if (datalist) datalist.innerHTML = fases.map(fase => `<option value="${escapeHtml(fase)}"></option>`).join("");
    atualizarFiltroFases(fases);

    const filtradas = filtrarOrdens(todas);
    const visiveis = filtradas.slice(0, limite);
    const lista = document.getElementById("cn252Lista");
    const contador = document.getElementById("cn252Contador");
    const maisWrap = document.getElementById("cn252MaisWrap");

    if (contador) contador.textContent = `${filtradas.length.toLocaleString("pt-BR")} OP${filtradas.length === 1 ? "" : "s"}`;
    if (lista) lista.innerHTML = visiveis.length
      ? visiveis.map(montarOp).join("")
      : '<div class="cn252-vazio">Nenhuma OP de Calcinha encontrada para estes filtros.</div>';

    if (maisWrap) {
      maisWrap.innerHTML = filtradas.length > visiveis.length
        ? `<button type="button" class="cn252-btn" data-acao="mais">Carregar mais (${(filtradas.length - visiveis.length).toLocaleString("pt-BR")})</button>`
        : "";
    }
  }

  function agendarRender() {
    if (renderAgendado) return;
    renderAgendado = true;
    requestAnimationFrame(render);
  }

  function coletarDraft(article) {
    if (!(article instanceof HTMLElement)) return null;
    const id = String(article.dataset.cn252Op || "");
    if (!id) return null;
    return {
      id,
      linha: valorLinha(article.querySelector('[data-campo="linha"]')?.value || ""),
      fase: texto(article.querySelector('[data-campo="fase"]')?.value),
      necessidade: texto(article.querySelector('[data-campo="necessidade"]')?.value)
    };
  }

  function registrarDraft(article) {
    const draft = coletarDraft(article);
    if (!draft) return;
    drafts.set(draft.id, {
      linha: draft.linha,
      fase: draft.fase,
      necessidade: draft.necessidade
    });
  }

  function mensagem(textoMsg, tipo = "") {
    const el = document.getElementById("cn252Msg");
    if (!el) return;
    el.textContent = textoMsg || "";
    el.className = `cn252-msg${tipo ? ` ${tipo}` : ""}`;
  }

  async function salvar(orderId, options = {}) {
    const id = String(orderId || "");
    if (!id || salvando.has(id)) return false;
    const state = dual();
    const op = state?.maps?.ordens?.get(id);
    if (!state?.firebase || !state?.db || !op) {
      mensagem("Os dados da Calcinha ainda não terminaram de carregar.", "erro");
      return false;
    }

    const article = document.querySelector(`#${ROOT_ID} [data-cn252-op="${CSS.escape(id)}"]`);
    const dados = article ? coletarDraft(article) : { id, ...(drafts.get(id) || valoresDaOp(op)) };
    if (!dados) return false;

    const atual = manejo(op);
    const user = state.auth?.currentUser;
    if (!user) {
      mensagem("Sua sessão expirou. Entre novamente.", "erro");
      return false;
    }

    const statusAtual = statusDaOp(op);
    const novoStatus = statusAtual === "bipado"
      ? "bipado"
      : (dados.linha || dados.fase || dados.necessidade ? "organizada" : "pendente");

    salvando.add(id);
    const botaoSalvarAtual = article?.querySelector('[data-acao="salvar"]');
    if (!options.silencioso && botaoSalvarAtual) {
      botaoSalvarAtual.disabled = true;
      botaoSalvarAtual.textContent = "Salvando...";
    }
    mensagem(`Salvando OP ${op.numeroOP || ""}...`);

    try {
      const { doc, updateDoc, serverTimestamp } = state.firebase;
      const agora = serverTimestamp();
      const linhaLabel = labelLinha(dados.linha);
      await updateDoc(doc(state.db, "ordensProducao", id), {
        tipoPeca: "calcinha",
        tipoPecaPadrao: "calcinha",
        tipoPecaLabel: "Calcinha",
        linhaCalcinha: dados.linha,
        linhaCalcinhaLabel: linhaLabel,
        fase: dados.fase,
        necessidade: dados.necessidade,
        necessidadeTexto: dados.necessidade,
        necessidadeManual: true,
        "manejosSetores.calcinha.linhaCalcinha": dados.linha,
        "manejosSetores.calcinha.linhaCalcinhaLabel": linhaLabel,
        "manejosSetores.calcinha.fase": dados.fase,
        "manejosSetores.calcinha.necessidade": dados.necessidade,
        "manejosSetores.calcinha.necessidadeTexto": dados.necessidade,
        "manejosSetores.calcinha.setor": "calcinha",
        "manejosSetores.calcinha.setorLabel": "Calcinha",
        "manejosSetores.calcinha.status": novoStatus,
        "manejosSetores.calcinha.atualizadoPor": user.uid,
        "manejosSetores.calcinha.atualizadoEm": agora,
        "manejoStatusSetores.calcinha": novoStatus,
        atualizadoPor: user.uid,
        atualizadoEm: agora
      });

      state.maps.ordens.set(id, {
        ...op,
        tipoPeca: "calcinha",
        tipoPecaPadrao: "calcinha",
        tipoPecaLabel: "Calcinha",
        linhaCalcinha: dados.linha,
        linhaCalcinhaLabel: linhaLabel,
        fase: dados.fase,
        necessidade: dados.necessidade,
        necessidadeTexto: dados.necessidade,
        necessidadeManual: true,
        manejosSetores: {
          ...(op.manejosSetores || {}),
          calcinha: {
            ...atual,
            linhaCalcinha: dados.linha,
            linhaCalcinhaLabel: linhaLabel,
            fase: dados.fase,
            necessidade: dados.necessidade,
            necessidadeTexto: dados.necessidade,
            setor: "calcinha",
            setorLabel: "Calcinha",
            status: novoStatus,
            atualizadoPor: user.uid
          }
        },
        manejoStatusSetores: {
          ...(op.manejoStatusSetores || {}),
          calcinha: novoStatus
        },
        atualizadoPor: user.uid
      });

      drafts.delete(id);
      if (!options.silencioso && article) {
        const badge = article.querySelector(".cn252-status");
        if (badge) {
          badge.className = `cn252-status ${novoStatus}`;
          badge.textContent = statusLabel(novoStatus);
        }
      }
      if (!options.silencioso) mensagem(`OP ${op.numeroOP || ""} salva.`, "ok");
      return true;
    } catch (error) {
      console.error("[Calcinha 253] Falha ao salvar.", error);
      mensagem(`Não foi possível salvar a OP ${op.numeroOP || ""}.`, "erro");
      return false;
    } finally {
      salvando.delete(id);
      if (!options.silencioso && botaoSalvarAtual) {
        botaoSalvarAtual.disabled = false;
        botaoSalvarAtual.textContent = "Salvar";
      }
    }
  }

  async function enviar(orderId) {
    const id = String(orderId || "");
    const state = dual();
    const op = state?.maps?.ordens?.get(id);
    if (!op) return;

    const ok = await salvar(id, { silencioso: true });
    if (!ok) {
      mensagem("Corrija o salvamento antes de enviar a OP.", "erro");
      agendarRender();
      return;
    }

    const atualizada = state.maps.ordens.get(id);
    const dados = valoresDaOp(atualizada);
    if (!dados.linha) {
      mensagem(`Escolha Cotton Line ou Corpo Nu antes de enviar a OP ${op.numeroOP || ""}.`, "erro");
      agendarRender();
      return;
    }

    if (typeof window.mandarParaFaccao !== "function") {
      mensagem("O envio para facção ainda não terminou de carregar.", "erro");
      agendarRender();
      return;
    }

    mensagem(`Abrindo envio da OP ${op.numeroOP || ""}...`);
    try {
      await window.mandarParaFaccao(id);
      mensagem("", "");
    } catch (error) {
      console.error("[Calcinha 253] Falha ao iniciar envio.", error);
      mensagem("Não foi possível iniciar o envio para facção.", "erro");
    } finally {
      agendarRender();
    }
  }

  async function atualizar() {
    const state = dual();
    if (!window.corponuDualMode?.refresh || !state) {
      mensagem("Os dados ainda estão carregando.");
      return;
    }
    mensagem("Atualizando OPs da Calcinha...");
    try {
      await window.corponuDualMode.refresh();
      drafts.clear();
      limite = PAGE_SIZE;
      mensagem("Lista atualizada.", "ok");
    } catch (error) {
      console.error("[Calcinha 253] Falha ao atualizar.", error);
      mensagem("Não foi possível atualizar a lista.", "erro");
    } finally {
      agendarRender();
    }
  }

  function instalarEventosRoot(root) {
    root.addEventListener("input", event => {
      const campo = event.target?.closest?.("[data-campo]");
      if (!campo) {
        if (event.target?.id === "cn252Busca") {
          limite = PAGE_SIZE;
          agendarRender();
        }
        return;
      }
      const article = campo.closest("[data-cn252-op]");
      registrarDraft(article);
    });

    root.addEventListener("change", event => {
      const faseFiltro = event.target?.closest?.("[data-filtro-fase]");
      if (faseFiltro) {
        const chave = normalizar(faseFiltro.dataset.filtroFase || "");
        if (chave) {
          if (faseFiltro.checked) fasesSelecionadas.add(chave);
          else fasesSelecionadas.delete(chave);
          limite = PAGE_SIZE;
          agendarRender();
        }
        return;
      }
      const campo = event.target?.closest?.("[data-campo]");
      if (campo) {
        registrarDraft(campo.closest("[data-cn252-op]"));
        return;
      }
      if (["cn252FiltroLinha", "cn252FiltroStatus"].includes(event.target?.id)) {
        limite = PAGE_SIZE;
        agendarRender();
      }
    });

    root.addEventListener("click", event => {
      const botao = event.target?.closest?.("button[data-acao]");
      if (!botao) return;
      const acao = botao.dataset.acao;
      if (acao === "toggle-fases") {
        document.getElementById("cn253FaseFiltro")?.classList.toggle("aberto");
        return;
      }
      if (acao === "limpar-fases") {
        fasesSelecionadas.clear();
        limite = PAGE_SIZE;
        agendarRender();
        return;
      }
      if (acao === "remover-fase") {
        fasesSelecionadas.delete(normalizar(botao.dataset.fase || ""));
        limite = PAGE_SIZE;
        agendarRender();
        return;
      }
      if (acao === "limpar-filtros") {
        limparFiltros();
        return;
      }
      if (acao === "mais") {
        limite += PAGE_SIZE;
        agendarRender();
        return;
      }
      const article = botao.closest("[data-cn252-op]");
      const id = article?.dataset?.cn252Op || "";
      if (!id) return;
      registrarDraft(article);
      if (acao === "salvar") void salvar(id);
      if (acao === "enviar") void enviar(id);
    });

    root.querySelector("#cn252Atualizar")?.addEventListener("click", () => void atualizar());
  }

  function sincronizarModo() {
    injetarEstilo();
    garantirEstrutura();
    const ativa = calcinhaAtiva();
    if (document.body) {
      if (ativa) document.body.dataset.corponuCalcinhaDedicado = "1";
      else delete document.body.dataset.corponuCalcinhaDedicado;
    }
    if (ativa) agendarRender();
  }

  function instalarEventosGlobais() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo?.closest?.('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) return;
      queueMicrotask(sincronizarModo);
      requestAnimationFrame(sincronizarModo);
    }, true);

    document.addEventListener("click", event => {
      const filtro = document.getElementById("cn253FaseFiltro");
      if (filtro?.classList.contains("aberto") && !event.target?.closest?.("#cn253FaseFiltro")) filtro.classList.remove("aberto");
    }, true);
    document.addEventListener("corponu:dual-ready", sincronizarModo);
    window.addEventListener("pageshow", sincronizarModo);
  }

  function iniciar() {
    injetarEstilo();
    garantirEstrutura();
    instalarEventosGlobais();
    sincronizarModo();
    console.info(`[CorpoNu] Manejo Calcinha 253 ativo: ${VERSION}`);
  }

  window.CorpoNuManejoCalcinhaDedicado = {
    versao: VERSION,
    render,
    salvar,
    atualizar,
    drafts,
    fasesSelecionadas
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
