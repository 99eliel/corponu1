(() => {
  "use strict";

  const VERSION = "2026-08-14-faccoes-classificacao-visual-200";
  const FIREBASE_VERSION = "10.12.5";
  const PROCESSOS_PADRAO = [
    "ENCAPAR BOJO",
    "ALÇA",
    "INTERLOCK",
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA",
    "SUTIÃ MONTAGEM",
    "SUTIÃ COMPLETO"
  ];
  const PROCESSOS_EXCLUSIVOS_CALCINHA = new Set([
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA"
  ]);
  const CLASSE_TIPO_INCOMPATIVEL = "cn200-faccao-tipo-incompativel";

  if (window.__CORPONU_FACCOES_PROCESSOS_CADASTRADOS__ === VERSION) return;
  window.__CORPONU_FACCOES_PROCESSOS_CADASTRADOS__ = VERSION;

  let contextoPromise = null;
  let carregando = false;
  let cache = null;
  let cacheEm = 0;
  let classificacaoAgendada = 0;

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

  function adicionarLista(destino, valor) {
    const itens = Array.isArray(valor) ? valor : (valor ? [valor] : []);
    itens.forEach(item => {
      const nome = typeof item === "string"
        ? item
        : item?.nome || item?.processo || item?.servicoNome || item?.label || "";
      const ativo = typeof item === "object" ? item?.ativo !== false : true;
      const chave = normalizar(nome);
      if (ativo && chave && !["TODOS", "TODAS", "SELECIONE", "PROCESSO"].includes(chave)) {
        destino.set(chave, String(nome).trim().toUpperCase());
      }
    });
  }

  function garantirEstiloClassificacao() {
    if (document.getElementById("styleFaccaoClassificacaoVisual200")) return;
    const style = document.createElement("style");
    style.id = "styleFaccaoClassificacaoVisual200";
    style.textContent = `
      #faccoes #listaFaccoesMovimentacoes tr.${CLASSE_TIPO_INCOMPATIVEL},
      #faccoes #listaMovimentacoesUsuario tr.${CLASSE_TIPO_INCOMPATIVEL}{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function abaPrincipalFaccoesAtiva() {
    const corte = document.getElementById("abaFaccaoCorte");
    if (corte?.classList.contains("active")) return "corte";

    const ativa = document.querySelector('.corponu-dual-tabs[data-page="faccoes"] .corponu-dual-tab.active');
    const tipo = String(ativa?.dataset?.type || "").toLowerCase();
    return tipo === "calcinha" || tipo === "sutia" ? tipo : "";
  }

  function indiceProcessoDaTabela(tabela) {
    if (!tabela) return -1;
    const cabecalhos = [...tabela.querySelectorAll("thead th")];
    return cabecalhos.findIndex(th => normalizar(th.textContent) === "PROCESSO");
  }

  function processoDaLinha(linha) {
    const tabela = linha?.closest("table");
    const indice = indiceProcessoDaTabela(tabela);
    if (indice < 0) return "";
    return normalizar(linha.cells?.[indice]?.textContent || "");
  }

  function corrigirClassificacaoVisualMovimentacoes() {
    garantirEstiloClassificacao();

    const aba = abaPrincipalFaccoesAtiva();
    if (!aba || aba === "corte") {
      document.querySelectorAll(`#faccoes tr.${CLASSE_TIPO_INCOMPATIVEL}`)
        .forEach(linha => linha.classList.remove(CLASSE_TIPO_INCOMPATIVEL));
      return;
    }

    ["listaFaccoesMovimentacoes", "listaMovimentacoesUsuario"].forEach(id => {
      const tbody = document.getElementById(id);
      if (!tbody) return;

      tbody.querySelectorAll(":scope > tr").forEach(linha => {
        if (linha.querySelector(".empty") || linha.cells.length <= 1) return;

        const processo = processoDaLinha(linha);
        const ehCalcinha = PROCESSOS_EXCLUSIVOS_CALCINHA.has(processo);

        if (!ehCalcinha) {
          linha.classList.remove(CLASSE_TIPO_INCOMPATIVEL);
          return;
        }

        linha.dataset.corponuTipoProcessoVisual = "calcinha";

        if (aba === "sutia") {
          linha.classList.add(CLASSE_TIPO_INCOMPATIVEL);
          return;
        }

        // Se o processo da própria linha comprova que é Calcinha, ele prevalece
        // sobre metadados antigos/incompletos que possam ter marcado a movimentação
        // como Sutiã. Não altera o documento histórico; corrige somente a exibição.
        linha.classList.remove(CLASSE_TIPO_INCOMPATIVEL);
        linha.classList.remove("corponu-dual-hidden");
      });
    });
  }

  function agendarClassificacaoVisual() {
    if (classificacaoAgendada) return;
    classificacaoAgendada = window.requestAnimationFrame(() => {
      classificacaoAgendada = 0;
      corrigirClassificacaoVisualMovimentacoes();
    });
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase não inicializado");
      return { db: firestore.getFirestore(appModulo.getApp()), firestore };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function classificacaoFaccao(faccao) {
    const processos = Array.isArray(faccao?.processosPermitidos) ? faccao.processosPermitidos : [];
    const grupos = Array.isArray(faccao?.gruposPermitidos) ? faccao.gruposPermitidos : [];
    const texto = normalizar([...processos, ...grupos, faccao?.grupo].join(" "));
    return {
      sutia: typeof faccao?.trabalhaSutia === "boolean"
        ? faccao.trabalhaSutia
        : faccao?.atendeSutia === true || /SUTIA|BOJO|ALCA/.test(texto),
      calcinha: typeof faccao?.trabalhaCalcinha === "boolean"
        ? faccao.trabalhaCalcinha
        : faccao?.atendeCalcinha === true || texto.includes("CALCINHA")
    };
  }

  function abaAtual() {
    const titulo = normalizar(document.getElementById("s3titulo")?.textContent);
    if (titulo.includes("CALCINHA")) return "calcinha";
    if (titulo.includes("CORTE")) return "corte";
    return "sutia";
  }

  function processosDoDOM() {
    const resultado = new Map();

    document.querySelectorAll("#faccoes select").forEach(select => {
      if (select.id === "s3processo") return;
      if (!/processo/i.test(`${select.id} ${select.name} ${select.closest("label")?.textContent || ""}`)) return;
      [...select.options].forEach(option => adicionarLista(resultado, option.value || option.textContent));
    });

    document.querySelectorAll("#faccoes [data-processo], #faccoes [data-processo-nome]").forEach(elemento => {
      adicionarLista(resultado, elemento.dataset.processo || elemento.dataset.processoNome);
    });

    return resultado;
  }

  async function carregarBase() {
    if (cache && Date.now() - cacheEm < 30000) return cache;
    if (carregando) {
      for (let tentativa = 0; tentativa < 50 && carregando; tentativa += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (cache) return cache;
    }

    carregando = true;
    try {
      const { db, firestore: f } = await contexto();
      const porAba = {
        sutia: processosDoDOM(),
        calcinha: processosDoDOM(),
        corte: processosDoDOM()
      };

      const [faccoesSnap, precosSnap, configSnap] = await Promise.all([
        f.getDocs(f.collection(db, "faccoes")),
        f.getDocs(f.collection(db, "precosReferencia")),
        f.getDoc(f.doc(db, "configuracoes", "processos-corte"))
      ]);

      faccoesSnap.docs.forEach(documento => {
        const faccao = documento.data();
        if (faccao.ativo === false || faccao.cadastroPendente || faccao.duplicadaDe || faccao.statusImportacao === "duplicada_consolidada") return;
        const classe = classificacaoFaccao(faccao);
        const listas = [
          faccao.processosPermitidos,
          faccao.processos,
          faccao.servicosPermitidos,
          faccao.servicos,
          faccao.processo
        ];
        listas.forEach(lista => {
          adicionarLista(porAba.corte, lista);
          if (classe.sutia) adicionarLista(porAba.sutia, lista);
          if (classe.calcinha) adicionarLista(porAba.calcinha, lista);
        });
      });

      precosSnap.docs.forEach(documento => {
        const preco = documento.data();
        if (preco.ativo === false) return;
        const nome = preco.processo || preco.servicoNome || preco.processoMovimentacao;
        if (!nome) return;
        adicionarLista(porAba.corte, nome);
        const setor = normalizar(preco.setor || preco.area || preco.tipoPeca);
        const processo = normalizar(nome);
        if (setor.includes("CALCINHA") || processo.includes("CALCINHA")) {
          adicionarLista(porAba.calcinha, nome);
        } else if (setor.includes("SUTIA") || /SUTIA|BOJO|ALCA/.test(processo)) {
          adicionarLista(porAba.sutia, nome);
        } else {
          adicionarLista(porAba.sutia, nome);
          adicionarLista(porAba.calcinha, nome);
        }
      });

      const configuracao = configSnap.exists() ? configSnap.data() : {};
      (Array.isArray(configuracao.processos) ? configuracao.processos : []).forEach(processo => {
        if (processo?.ativo === false) return;
        adicionarLista(porAba.corte, processo);
        if (processo?.atendeSutia === true) adicionarLista(porAba.sutia, processo);
        if (processo?.atendeCalcinha === true) adicionarLista(porAba.calcinha, processo);
      });

      PROCESSOS_PADRAO.forEach(nome => {
        adicionarLista(porAba.corte, nome);
        const chave = normalizar(nome);
        if (chave === "INTERLOCK") {
          adicionarLista(porAba.sutia, nome);
          adicionarLista(porAba.calcinha, nome);
        } else if (chave.includes("CALCINHA")) {
          adicionarLista(porAba.calcinha, nome);
        } else {
          adicionarLista(porAba.sutia, nome);
        }
      });

      cache = porAba;
      cacheEm = Date.now();
      return porAba;
    } finally {
      carregando = false;
    }
  }

  function garantirSelect() {
    const atual = document.getElementById("s3processo");
    if (!atual) return null;
    if (atual instanceof HTMLSelectElement) return atual;

    const select = document.createElement("select");
    [...atual.attributes].forEach(atributo => {
      if (atributo.name === "type" || atributo.name === "placeholder") return;
      select.setAttribute(atributo.name, atributo.value);
    });
    select.id = "s3processo";
    select.required = true;
    select.innerHTML = '<option value="">Busque a OP para carregar</option>';
    atual.replaceWith(select);
    return select;
  }

  async function preencherSelect() {
    const select = garantirSelect();
    if (!select) return;

    const aba = abaAtual();
    const valorAnterior = select.value;
    select.disabled = true;
    select.innerHTML = '<option value="">Carregando processos cadastrados...</option>';

    try {
      const base = await carregarBase();
      const itens = [...(base[aba] || new Map()).values()]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

      select.innerHTML = '<option value="">Selecione o processo</option>' + itens
        .map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`)
        .join("");
      select.disabled = false;
      if (itens.some(nome => normalizar(nome) === normalizar(valorAnterior))) {
        select.value = itens.find(nome => normalizar(nome) === normalizar(valorAnterior));
      }

      if (!itens.length) {
        select.innerHTML = '<option value="">Nenhum processo cadastrado</option>';
        select.disabled = true;
      }
    } catch (error) {
      console.error("Não foi possível carregar os processos cadastrados.", error);
      select.innerHTML = '<option value="">Erro ao carregar processos</option>';
      select.disabled = true;
    }
  }

  function preparar() {
    garantirSelect();
    agendarClassificacaoVisual();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest("#btnSaidaAbas, #btnSaidaCorteNovo")) {
      cache = null;
      cacheEm = 0;
      setTimeout(preencherSelect, 80);
    }

    if (alvo.closest("#s3buscar")) {
      setTimeout(preencherSelect, 180);
      setTimeout(preencherSelect, 650);
    }

    if (alvo.closest('.corponu-dual-tabs[data-page="faccoes"] .corponu-dual-tab, #abaFaccaoCorte, [data-page="faccoes"]')) {
      [0, 60, 180, 420].forEach(atraso => window.setTimeout(agendarClassificacaoVisual, atraso));
    }
  }, true);

  const observer = new MutationObserver(() => preparar());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      preparar();
      observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  } else {
    preparar();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
