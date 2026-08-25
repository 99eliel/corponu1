(() => {
  "use strict";

  const VERSION = "2026-08-25-manejo-calcinha-controlador-estavel-242";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_CONTROLADOR_242__";
  const DATALIST_ID = "manejoFasesListCalcinha";
  const SELECT_ATTR = "data-corponu-calcinha-fase-242";
  const STYLE_ID = "corponuManejoCalcinha242Style";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const drafts = new Map();
  let observerTabela = null;
  let observerFases = null;
  let observerEsperaTabela = null;
  let aplicando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]') instanceof Element;
  }

  function orderIdDaLinha(row) {
    if (!(row instanceof Element)) return "";
    const botao = row.querySelector('.btn-save-manejo[onclick*="salvarManejoLinha"]');
    const codigo = String(botao?.getAttribute("onclick") || "");
    const match = codigo.match(/salvarManejoLinha\(\s*['\"]([^'\"]+)['\"]\s*\)/);
    return match?.[1] || "";
  }

  function campo(row, nome) {
    if (!(row instanceof Element)) return null;
    return row.querySelector(`[id$="-${nome}"]`);
  }

  function lerLinha(row) {
    return {
      linha: texto(campo(row, "linha")?.value),
      fase: texto(campo(row, "fase")?.value),
      necessidade: texto(campo(row, "necessidade")?.value)
    };
  }

  function fasesOficiais() {
    const preferida = document.getElementById(DATALIST_ID);
    const fallback = document.getElementById("manejoFasesList");
    const lista = preferida?.querySelectorAll("option")?.length ? preferida : fallback;
    if (!lista) return [];

    const mapa = new Map();
    lista.querySelectorAll("option").forEach(option => {
      const valor = texto(option.value || option.textContent);
      const chave = normalizar(valor);
      if (valor && chave && !mapa.has(chave)) mapa.set(chave, valor);
    });
    return [...mapa.values()];
  }

  function valorOficial(valor, fases = fasesOficiais()) {
    const chave = normalizar(valor);
    if (!chave) return "";
    return fases.find(item => normalizar(item) === chave) || "";
  }

  function garantirEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #listaManejoInline select[${SELECT_ATTR}="1"]{
        width:100%;min-width:150px;box-sizing:border-box;
        border:1px solid #cbd5e1;border-radius:7px;
        padding:8px 30px 8px 9px;background:#fff;color:#0f172a;
        font:inherit;line-height:1.2;
      }
      #listaManejoInline select[${SELECT_ATTR}="1"]:focus{
        outline:2px solid rgba(124,58,237,.22);border-color:#7c3aed;
      }
      #listaManejoInline tr[data-corponu-calcinha-dirty="1"] .btn-save-manejo{
        box-shadow:0 0 0 2px rgba(124,58,237,.18);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function assinaturaOpcoes(fases, atual) {
    return `${fases.map(normalizar).join("|")}::${normalizar(atual)}`;
  }

  function preencherSelect(select, fases, desejado) {
    const oficial = valorOficial(desejado, fases);
    const assinatura = assinaturaOpcoes(fases, desejado);

    if (select.dataset.corponuAssinatura242 !== assinatura) {
      const frag = document.createDocumentFragment();
      const vazio = document.createElement("option");
      vazio.value = "";
      vazio.textContent = fases.length ? "Selecione a fase" : "Nenhuma fase disponível";
      frag.appendChild(vazio);

      if (desejado && !oficial) {
        const legado = document.createElement("option");
        legado.value = desejado;
        legado.textContent = `${desejado} (fase atual)`;
        legado.disabled = true;
        frag.appendChild(legado);
      }

      fases.forEach(fase => {
        const option = document.createElement("option");
        option.value = fase;
        option.textContent = fase;
        frag.appendChild(option);
      });

      select.replaceChildren(frag);
      select.dataset.corponuAssinatura242 = assinatura;
    }

    select.disabled = fases.length === 0;
    select.value = oficial || desejado || "";
  }

  function converterFase(row, desejado = null) {
    let atual = campo(row, "fase");
    if (!(atual instanceof HTMLInputElement || atual instanceof HTMLSelectElement)) return null;

    const valorAtual = desejado ?? texto(atual.value);
    const fases = fasesOficiais();

    if (atual instanceof HTMLSelectElement && atual.getAttribute(SELECT_ATTR) === "1") {
      preencherSelect(atual, fases, valorAtual);
      return atual;
    }

    if (!(atual instanceof HTMLInputElement)) return atual;

    const select = document.createElement("select");
    select.id = atual.id;
    select.className = atual.className || "";
    select.setAttribute(SELECT_ATTR, "1");
    select.setAttribute("aria-label", atual.getAttribute("aria-label") || "Fase da Calcinha");
    if (atual.title) select.title = atual.title;
    preencherSelect(select, fases, valorAtual);
    atual.replaceWith(select);

    const plus = select.closest(".fase-plus")?.querySelector(".btn-plus");
    if (plus instanceof HTMLElement) plus.hidden = true;

    return select;
  }

  function valoresIguais(a, b) {
    return normalizar(a) === normalizar(b);
  }

  function servidorConfirmou(draft, servidor) {
    if (!draft?.saving) return false;
    return ["linha", "fase", "necessidade"].every(nome => {
      if (!draft.dirty?.[nome]) return true;
      return valoresIguais(servidor[nome], draft.valores[nome]);
    });
  }

  function aplicarDraft(row, draft) {
    if (!draft) return;
    ["linha", "necessidade"].forEach(nome => {
      if (!draft.dirty?.[nome]) return;
      const el = campo(row, nome);
      if (el && "value" in el) el.value = draft.valores[nome] ?? "";
    });

    const desejadoFase = draft.dirty?.fase ? (draft.valores.fase ?? "") : null;
    const fase = converterFase(row, desejadoFase);
    if (fase && draft.dirty?.fase) fase.value = draft.valores.fase ?? "";
    row.dataset.corponuCalcinhaDirty = "1";
  }

  function processarLinha(row) {
    if (!(row instanceof HTMLTableRowElement)) return;
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const servidor = lerLinha(row);
    const draft = drafts.get(orderId);

    if (draft && servidorConfirmou(draft, servidor)) {
      drafts.delete(orderId);
      delete row.dataset.corponuCalcinhaDirty;
      converterFase(row, servidor.fase);
      return;
    }

    if (draft) {
      aplicarDraft(row, draft);
      return;
    }

    converterFase(row, servidor.fase);
  }

  function processarTabela() {
    if (aplicando || !calcinhaAtiva()) return;
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return;

    aplicando = true;
    const observava = observerTabela?.__target === tbody;
    if (observava) observerTabela.disconnect();
    try {
      tbody.querySelectorAll('tr[data-manejo-row="1"]').forEach(processarLinha);
    } finally {
      if (observava) {
        observerTabela.observe(tbody, { childList: true, subtree: true });
        observerTabela.__target = tbody;
      }
      aplicando = false;
    }
  }

  function registrarDraft(row, nome, valor) {
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const anterior = drafts.get(orderId) || {
      valores: lerLinha(row),
      dirty: { linha: false, fase: false, necessidade: false },
      saving: false
    };

    anterior.valores[nome] = texto(valor);
    anterior.dirty[nome] = true;
    anterior.saving = false;
    drafts.set(orderId, anterior);
    row.dataset.corponuCalcinhaDirty = "1";
  }

  function campoEditado(alvo) {
    const id = String(alvo?.id || "");
    if (/-fase$/i.test(id)) return "fase";
    if (/-linha$/i.test(id)) return "linha";
    if (/-necessidade$/i.test(id)) return "necessidade";
    return "";
  }

  function capturarEdicao(event) {
    if (!calcinhaAtiva()) return;
    const alvo = event.target;
    if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
    const row = alvo.closest('#listaManejoInline tr[data-manejo-row="1"]');
    if (!(row instanceof HTMLTableRowElement)) return;

    const nome = campoEditado(alvo);
    if (!nome) return;
    registrarDraft(row, nome, alvo.value);
  }

  function prepararSalvamento(event) {
    if (!calcinhaAtiva()) return;
    const alvo = event.target instanceof Element ? event.target.closest(".btn-save-manejo") : null;
    if (!(alvo instanceof HTMLElement)) return;
    const row = alvo.closest('#listaManejoInline tr[data-manejo-row="1"]');
    if (!(row instanceof HTMLTableRowElement)) return;
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const atuais = lerLinha(row);
    const draft = drafts.get(orderId) || {
      valores: { ...atuais },
      dirty: { linha: false, fase: false, necessidade: false },
      saving: false
    };

    ["linha", "fase", "necessidade"].forEach(nome => {
      if (draft.dirty[nome]) draft.valores[nome] = atuais[nome];
    });
    draft.saving = true;
    drafts.set(orderId, draft);
  }

  function limparResiduosAntigos() {
    [
      "corponuManejoCalcinhaFase223Style",
      "corponuManejoCalcinhaFaseSelect218Style",
      "corponuManejoCalcinhaFaseSelect219Style",
      "corponuManejoCalcinhaFaseSelect220Style",
      "corponuManejoCalcinhaFaseSelect221Style",
      "corponuManejoCalcinhaFase222Style"
    ].forEach(id => document.getElementById(id)?.remove());

    document.querySelectorAll(
      "#listaManejoInline .corponu-fase-calcinha-select-223, #listaManejoInline .corponu-fase-select-218, #listaManejoInline .corponu-fase-select-219, #listaManejoInline .corponu-fase-select-220, #listaManejoInline .corponu-fase-select-221, #listaManejoInline .corponu-fase-calcinha-select-222"
    ).forEach(el => el.remove());

    document.querySelectorAll("#listaManejoInline input[class*='fase-calcinha-input-legado'], #listaManejoInline input[class*='fase-input-legado']")
      .forEach(input => {
        [...input.classList].filter(classe => classe.includes("fase") && classe.includes("legado"))
          .forEach(classe => input.classList.remove(classe));
        input.style.removeProperty("display");
      });
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return false;
    if (observerTabela?.__target === tbody) return true;

    observerTabela?.disconnect();
    observerTabela = new MutationObserver(() => {
      processarTabela();
    });
    observerTabela.observe(tbody, { childList: true, subtree: true });
    observerTabela.__target = tbody;
    return true;
  }

  function observarFases() {
    const datalist = document.getElementById(DATALIST_ID) || document.getElementById("manejoFasesList");
    if (!datalist) return false;
    if (observerFases?.__target === datalist) return true;

    observerFases?.disconnect();
    observerFases = new MutationObserver(processarTabela);
    observerFases.observe(datalist, { childList: true });
    observerFases.__target = datalist;
    return true;
  }

  function esperarTabelaSeNecessario() {
    if (observarTabela()) return;
    if (observerEsperaTabela) return;
    const alvo = document.getElementById("manejo") || document.body;
    if (!alvo) return;

    observerEsperaTabela = new MutationObserver(() => {
      if (!observarTabela()) return;
      observerEsperaTabela.disconnect();
      observerEsperaTabela = null;
      processarTabela();
    });
    observerEsperaTabela.observe(alvo, { childList: true, subtree: true });
  }

  function aoTrocarTelaOuSetor(event) {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) return;
    queueMicrotask(() => {
      esperarTabelaSeNecessario();
      observarFases();
      limparResiduosAntigos();
      processarTabela();
    });
  }

  function iniciar() {
    garantirEstilo();
    limparResiduosAntigos();
    esperarTabelaSeNecessario();
    observarFases();

    document.addEventListener("input", capturarEdicao, true);
    document.addEventListener("change", capturarEdicao, true);
    document.addEventListener("click", prepararSalvamento, true);
    document.addEventListener("click", aoTrocarTelaOuSetor, false);

    processarTabela();
    console.info(`[CorpoNu] Manejo Calcinha controlador único ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
