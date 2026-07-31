(() => {
  "use strict";

  const VERSION = "2026-07-31-faccoes-saida-processos-direto-46";
  const FB = "10.12.5";

  if (window.__CORPONU_FACCOES_GRUPOS_SAIDA_FIX__ === VERSION) return;
  window.__CORPONU_FACCOES_GRUPOS_SAIDA_FIX__ = VERSION;

  let contextoPromise = null;
  let cacheFaccoes = null;
  let cacheEm = 0;
  let sequencia = 0;
  let estadoAtual = { processo: "", nomes: [], assinatura: "" };
  let observadorSelect = null;
  let reaplicando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function processoCanonico(valor) {
    const texto = normalizar(valor);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPA BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "ALÇAS": "ALÇA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "CALCINHA PRONTA": "CALCINHA COMPLETA"
    };
    return aliases[texto] || texto;
  }

  function nomeCanonico(valor) {
    return normalizar(valor);
  }

  function processosDaFaccao(faccao) {
    const campos = [
      faccao?.processosPermitidos,
      faccao?.processos,
      faccao?.servicosPermitidos,
      faccao?.servicos,
      faccao?.processo
    ];
    const processos = new Set();

    campos.forEach(campo => {
      const itens = Array.isArray(campo) ? campo : (campo ? [campo] : []);
      itens.forEach(item => {
        const nome = processoCanonico(
          typeof item === "string"
            ? item
            : item?.nome || item?.processo || item?.servicoNome || item?.label || ""
        );
        if (nome) processos.add(nome);
      });
    });

    return [...processos];
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return {
        db: firestore.getFirestore(appModulo.getApp()),
        firestore
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function carregarFaccoes(forcar = false) {
    if (!forcar && cacheFaccoes && Date.now() - cacheEm < 15000) return cacheFaccoes;

    const { db, firestore: fs } = await contexto();
    const snap = await fs.getDocs(fs.collection(db, "faccoes"));
    const mapa = new Map();

    snap.docs.forEach(documento => {
      const faccao = { id: documento.id, ...documento.data() };
      if (faccao.ativo === false || faccao.cadastroPendente || faccao.duplicadaDe || faccao.statusImportacao === "duplicada_consolidada") return;
      const chave = nomeCanonico(faccao.nome);
      if (!chave) return;
      const atual = mapa.get(chave);
      if (!atual || processosDaFaccao(faccao).length > processosDaFaccao(atual).length) mapa.set(chave, faccao);
    });

    cacheFaccoes = [...mapa.values()].sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { numeric: true })
    );
    cacheEm = Date.now();
    return cacheFaccoes;
  }

  async function faccoesDoProcesso(processo) {
    const processoNormalizado = processoCanonico(processo);
    if (!processoNormalizado) return [];
    const faccoes = await carregarFaccoes(true);
    return faccoes.filter(faccao => processosDaFaccao(faccao).includes(processoNormalizado));
  }

  function garantirAjuda() {
    const select = document.getElementById("s3faccao");
    const label = select?.closest("label");
    if (!select || !label) return null;
    let ajuda = document.getElementById("s3faccaoAjuda46");
    if (!ajuda) {
      ajuda = document.createElement("small");
      ajuda.id = "s3faccaoAjuda46";
      ajuda.style.cssText = "display:block;margin-top:6px;color:#64748b;font-size:11px;font-weight:700";
      label.appendChild(ajuda);
    }
    return ajuda;
  }

  function assinaturaDesejada(nomes) {
    return nomes.map(nomeCanonico).join("|");
  }

  function assinaturaAtual(select) {
    return [...select.options]
      .slice(1)
      .map(option => nomeCanonico(option.value || option.textContent))
      .filter(Boolean)
      .join("|");
  }

  function aplicarNomesNoSelect(nomes, mensagemVazia = "Nenhuma facção cadastrada neste processo") {
    const select = document.getElementById("s3faccao");
    if (!(select instanceof HTMLSelectElement)) return;

    const nomesOrdenados = [...new Set(nomes.map(nome => String(nome || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    const assinatura = assinaturaDesejada(nomesOrdenados);
    const ajuda = garantirAjuda();

    if (assinaturaAtual(select) === assinatura && select.disabled === !nomesOrdenados.length) {
      if (ajuda) ajuda.textContent = nomesOrdenados.length
        ? `${nomesOrdenados.length} facção(ões) habilitada(s) neste processo.`
        : mensagemVazia;
      return;
    }

    const anterior = select.value;
    reaplicando = true;
    select.innerHTML = nomesOrdenados.length
      ? '<option value="">Selecione a facção</option>' + nomesOrdenados
        .map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`)
        .join("")
      : `<option value="">${escapar(mensagemVazia)}</option>`;
    select.disabled = !nomesOrdenados.length;

    const encontrado = nomesOrdenados.find(nome => nomeCanonico(nome) === nomeCanonico(anterior));
    if (encontrado) select.value = encontrado;
    reaplicando = false;

    estadoAtual.assinatura = assinatura;
    if (ajuda) ajuda.textContent = nomesOrdenados.length
      ? `${nomesOrdenados.length} facção(ões) habilitada(s) neste processo.`
      : mensagemVazia;
  }

  function instalarProtecaoSelect() {
    const select = document.getElementById("s3faccao");
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset.protegidoProcessos46 === "1") return;

    select.dataset.protegidoProcessos46 = "1";
    observadorSelect?.disconnect();
    observadorSelect = new MutationObserver(() => {
      if (reaplicando || !estadoAtual.processo || !estadoAtual.nomes.length) return;
      if (assinaturaAtual(select) !== estadoAtual.assinatura) {
        window.setTimeout(() => aplicarNomesNoSelect(estadoAtual.nomes), 0);
      }
    });
    observadorSelect.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
  }

  async function atualizarFaccoesDoProcesso() {
    instalarProtecaoSelect();
    const processoSelect = document.getElementById("s3processo");
    const faccaoSelect = document.getElementById("s3faccao");
    if (!(processoSelect instanceof HTMLSelectElement || processoSelect instanceof HTMLInputElement) || !(faccaoSelect instanceof HTMLSelectElement)) return;

    const processo = processoCanonico(processoSelect.value);
    const minhaSequencia = ++sequencia;
    estadoAtual = { processo, nomes: [], assinatura: "" };

    if (!processo) {
      aplicarNomesNoSelect([], "Escolha o processo primeiro");
      return;
    }

    faccaoSelect.disabled = true;
    faccaoSelect.innerHTML = '<option value="">Carregando facções habilitadas...</option>';
    const ajuda = garantirAjuda();
    if (ajuda) ajuda.textContent = `Consultando facções cadastradas em ${processo}...`;

    try {
      const faccoes = await faccoesDoProcesso(processo);
      if (minhaSequencia !== sequencia) return;
      const nomes = faccoes.map(faccao => faccao.nome || "").filter(Boolean);
      estadoAtual = {
        processo,
        nomes,
        assinatura: assinaturaDesejada(nomes)
      };
      aplicarNomesNoSelect(nomes);
    } catch (error) {
      console.error("Erro ao carregar facções pelo processo cadastrado.", error);
      if (minhaSequencia !== sequencia) return;
      aplicarNomesNoSelect([], "Erro ao carregar facções");
    }
  }

  function prepararFormulario() {
    instalarProtecaoSelect();
    const processo = document.getElementById("s3processo");
    if (processo?.value) atualizarFaccoesDoProcesso();
  }

  document.addEventListener("change", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.matches("#s3processo")) return;
    event.stopImmediatePropagation();
    atualizarFaccoesDoProcesso();
  }, true);

  document.addEventListener("input", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.matches("#s3processo")) return;
    event.stopImmediatePropagation();
    window.setTimeout(atualizarFaccoesDoProcesso, 0);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest("#btnSaidaAbas, #btnSaidaCorteNovo")) {
      [80, 300, 700].forEach(atraso => window.setTimeout(prepararFormulario, atraso));
    }

    if (alvo.closest("#s3buscar")) {
      cacheFaccoes = null;
      cacheEm = 0;
      [250, 650, 1100].forEach(atraso => window.setTimeout(prepararFormulario, atraso));
    }
  }, true);

  const inicial = window.setInterval(() => {
    if (document.getElementById("s3faccao")) {
      instalarProtecaoSelect();
      window.clearInterval(inicial);
    }
  }, 250);
  window.setTimeout(() => window.clearInterval(inicial), 10000);
})();