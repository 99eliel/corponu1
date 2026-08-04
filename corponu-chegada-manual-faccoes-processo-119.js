(() => {
  "use strict";

  const VERSION = "2026-08-04-chegada-manual-faccoes-processo-119";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalChegadaManualFaccao";
  const PROCESSO_ID = "chegadaManualProcesso";
  const FACCAO_ID = "chegadaManualFaccao";
  const DATALIST_ID = "chegadaManualFaccaoList";

  if (window.__CORPONU_CHEGADA_MANUAL_FACCOES_119__ === VERSION) return;
  window.__CORPONU_CHEGADA_MANUAL_FACCOES_119__ = VERSION;

  let contextoPromise = null;
  let cacheFaccoes = null;
  let cacheEm = 0;
  let sequencia = 0;
  let reaplicando = false;
  let observadorSelect = null;
  let assinaturaAtual = "";
  let processoAtual = "";
  let nomesAtuais = [];

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapar = valor => texto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      BOJO: "ENCAPAR BOJO",
      ENCAPAR: "ENCAPAR BOJO",
      "ENCAPA BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA",
      ALCAS: "ALÇA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "CALCINHA PRONTA": "CALCINHA COMPLETA"
    };
    return aliases[chave] || chave;
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
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
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
    if (!forcar && cacheFaccoes && Date.now() - cacheEm < 10000) return cacheFaccoes;

    const { db, firestore: fs } = await contexto();
    const snap = await fs.getDocs(fs.collection(db, "faccoes"));
    const mapa = new Map();

    snap.docs.forEach(documento => {
      const faccao = { id: documento.id, ...documento.data() };
      if (
        faccao.ativo === false ||
        faccao.cadastroPendente ||
        faccao.duplicadaDe ||
        faccao.statusImportacao === "duplicada_consolidada"
      ) return;

      const chave = normalizar(faccao.nome);
      if (!chave) return;

      const atual = mapa.get(chave);
      if (!atual || processosDaFaccao(faccao).length > processosDaFaccao(atual).length) {
        mapa.set(chave, faccao);
      }
    });

    cacheFaccoes = [...mapa.values()].sort((a, b) =>
      texto(a.nome).localeCompare(texto(b.nome), "pt-BR", { numeric: true })
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

  function elementos() {
    return {
      modal: document.getElementById(MODAL_ID),
      processo: document.getElementById(PROCESSO_ID),
      faccao: document.getElementById(FACCAO_ID),
      datalist: document.getElementById(DATALIST_ID)
    };
  }

  function assinaturaNomes(nomes) {
    return nomes.map(normalizar).join("|");
  }

  function assinaturaDestino(destino, datalist) {
    if (destino instanceof HTMLSelectElement) {
      return [...destino.options]
        .slice(1)
        .map(option => normalizar(option.value || option.textContent))
        .filter(Boolean)
        .join("|");
    }
    if (datalist instanceof HTMLDataListElement) {
      return [...datalist.options]
        .map(option => normalizar(option.value))
        .filter(Boolean)
        .join("|");
    }
    return "";
  }

  function garantirAjuda(destino) {
    const label = destino?.closest("label");
    if (!label) return null;
    let ajuda = document.getElementById("chegadaManualFaccaoAjuda119");
    if (!ajuda) {
      ajuda = document.createElement("small");
      ajuda.id = "chegadaManualFaccaoAjuda119";
      ajuda.style.cssText = "display:block;margin-top:6px;color:#64748b;font-size:11px;font-weight:700";
      label.appendChild(ajuda);
    }
    return ajuda;
  }

  function aplicarNomes(nomes, mensagemVazia = "Nenhuma facção ativa vinculada a este processo") {
    const { faccao, datalist } = elementos();
    if (!(faccao instanceof HTMLSelectElement || faccao instanceof HTMLInputElement)) return;

    const nomesOrdenados = [...new Map(
      nomes
        .map(nome => texto(nome))
        .filter(Boolean)
        .map(nome => [normalizar(nome), nome])
    ).values()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

    const assinatura = assinaturaNomes(nomesOrdenados);
    const ajuda = garantirAjuda(faccao);
    const anterior = texto(faccao.value);
    reaplicando = true;

    if (faccao instanceof HTMLSelectElement) {
      faccao.innerHTML = nomesOrdenados.length
        ? '<option value="">Selecione quem realizou o processo</option>' + nomesOrdenados
          .map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`)
          .join("")
        : `<option value="">${escapar(mensagemVazia)}</option>`;
      faccao.disabled = !nomesOrdenados.length;

      const encontrado = nomesOrdenados.find(nome => normalizar(nome) === normalizar(anterior));
      if (encontrado) faccao.value = encontrado;
    } else {
      let lista = datalist;
      if (!(lista instanceof HTMLDataListElement)) {
        lista = document.createElement("datalist");
        lista.id = DATALIST_ID;
        faccao.after(lista);
        faccao.setAttribute("list", DATALIST_ID);
      }
      lista.innerHTML = nomesOrdenados
        .map(nome => `<option value="${escapar(nome)}"></option>`)
        .join("");
      faccao.disabled = !nomesOrdenados.length;
      if (anterior && !nomesOrdenados.some(nome => normalizar(nome) === normalizar(anterior))) {
        faccao.value = "";
      }
      faccao.placeholder = nomesOrdenados.length
        ? "Selecione quem realizou o processo"
        : mensagemVazia;
    }

    reaplicando = false;
    assinaturaAtual = assinatura;
    nomesAtuais = nomesOrdenados;

    if (ajuda) {
      ajuda.textContent = nomesOrdenados.length
        ? `${nomesOrdenados.length} facção(ões) ativa(s) vinculada(s) a ${processoAtual}.`
        : mensagemVazia;
    }
  }

  function instalarProtecao() {
    const { faccao, datalist } = elementos();
    if (!(faccao instanceof HTMLSelectElement || faccao instanceof HTMLInputElement)) return;

    observadorSelect?.disconnect();
    observadorSelect = new MutationObserver(() => {
      if (reaplicando || !processoAtual || !nomesAtuais.length) return;
      if (assinaturaDestino(faccao, datalist) !== assinaturaAtual || faccao.disabled) {
        window.setTimeout(() => aplicarNomes(nomesAtuais), 0);
      }
    });

    observadorSelect.observe(faccao, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "list"]
    });

    if (datalist instanceof HTMLDataListElement) {
      observadorSelect.observe(datalist, { childList: true, subtree: true });
    }
  }

  async function atualizar(forcar = false) {
    const { processo, faccao } = elementos();
    if (!(processo instanceof HTMLSelectElement || processo instanceof HTMLInputElement)) return;
    if (!(faccao instanceof HTMLSelectElement || faccao instanceof HTMLInputElement)) return;

    instalarProtecao();
    const processoSelecionado = processoCanonico(processo.value);
    const minhaSequencia = ++sequencia;
    processoAtual = processoSelecionado;
    nomesAtuais = [];
    assinaturaAtual = "";

    if (!processoSelecionado) {
      aplicarNomes([], "Escolha o processo primeiro");
      return;
    }

    faccao.disabled = true;
    if (faccao instanceof HTMLSelectElement) {
      faccao.innerHTML = '<option value="">Carregando facções ativas...</option>';
    } else {
      faccao.placeholder = "Carregando facções ativas...";
    }

    const ajuda = garantirAjuda(faccao);
    if (ajuda) ajuda.textContent = `Consultando facções cadastradas em ${processoSelecionado}...`;

    try {
      const faccoes = await faccoesDoProcesso(processoSelecionado, forcar);
      if (sequencia !== minhaSequencia) return;
      const nomes = faccoes.map(faccaoItem => faccaoItem.nome).filter(Boolean);
      processoAtual = processoSelecionado;
      nomesAtuais = nomes;
      assinaturaAtual = assinaturaNomes(nomes);
      aplicarNomes(nomes);
    } catch (error) {
      console.error("Erro ao carregar facções na chegada manual.", error);
      if (sequencia !== minhaSequencia) return;
      aplicarNomes([], "Erro ao carregar facções ativas");
    }
  }

  function preparar(forcar = false) {
    instalarProtecao();
    const { processo } = elementos();
    if (processo?.value) atualizar(forcar);
  }

  document.addEventListener("change", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (alvo?.matches?.(`#${PROCESSO_ID}`)) {
      window.setTimeout(() => atualizar(true), 0);
    }
  });

  document.addEventListener("input", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (alvo?.matches?.(`#${PROCESSO_ID}`)) {
      window.setTimeout(() => atualizar(true), 40);
    }
  });

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    const botao = alvo.closest("button");
    const rotulo = normalizar(botao?.textContent);
    const abriuChegada = alvo.closest("#btnAbrirChegadaManualFaccao") ||
      rotulo.includes("REGISTRAR CHEGADA") ||
      rotulo.includes("CHEGADA MANUAL");

    if (abriuChegada) {
      cacheFaccoes = null;
      cacheEm = 0;
      [80, 250, 600, 1000].forEach(atraso =>
        window.setTimeout(() => preparar(true), atraso)
      );
    }

    if (alvo.closest("#btnBuscarOPChegadaManual, #btnBuscarChegadaManualOP") || rotulo === "BUSCAR OP") {
      cacheFaccoes = null;
      cacheEm = 0;
      [200, 500, 900].forEach(atraso =>
        window.setTimeout(() => preparar(true), atraso)
      );
    }
  }, true);

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.cnFaccoes119Observado === "1") return;
    modal.dataset.cnFaccoes119Observado = "1";

    const observer = new MutationObserver(() => {
      if (!modal.classList.contains("hidden")) {
        [0, 120, 350].forEach(atraso =>
          window.setTimeout(() => preparar(false), atraso)
        );
      }
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true
    });
  }

  const inicial = window.setInterval(() => {
    observarModal();
    instalarProtecao();
  }, 250);
  window.setTimeout(() => window.clearInterval(inicial), 12000);
})();
