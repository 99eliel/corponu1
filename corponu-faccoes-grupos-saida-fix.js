(() => {
  "use strict";

  const VERSION = "2026-07-31-faccoes-grupos-saida-direto-45";
  const FB = "10.12.5";
  const CONFIG_ID = "grupos-faccoes-processos";

  if (window.__CORPONU_FACCOES_GRUPOS_SAIDA_FIX__ === VERSION) return;
  window.__CORPONU_FACCOES_GRUPOS_SAIDA_FIX__ = VERSION;

  let contextoPromise = null;
  let sequencia = 0;

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

  function slug(valor) {
    return normalizar(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "processo";
  }

  function nomeCanonico(valor) {
    const texto = normalizar(valor);
    const aliases = {
      "LARA CRISTINA KAKA": "KAKA",
      "LARA CRISTINA (KAKA)": "KAKA",
      "LARA CRISTINA/KAKA": "KAKA",
      "GISLAINE": "GISLAINY"
    };
    return aliases[texto] || texto;
  }

  function docIdSeguro(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 180);
  }

  function tokensFaccao(faccao) {
    return new Set([
      String(faccao?.id || ""),
      docIdSeguro(faccao?.nome),
      slug(faccao?.nome),
      normalizar(faccao?.nome),
      nomeCanonico(faccao?.nome)
    ].filter(Boolean));
  }

  function processosDaFaccao(faccao) {
    const campos = [
      faccao?.processosPermitidos,
      faccao?.processos,
      faccao?.servicosPermitidos,
      faccao?.servicos,
      faccao?.processo
    ];
    const resultado = new Set();
    campos.forEach(campo => {
      const itens = Array.isArray(campo) ? campo : (campo ? [campo] : []);
      itens.forEach(item => {
        const nome = processoCanonico(typeof item === "string"
          ? item
          : item?.nome || item?.processo || item?.servicoNome || item?.label || "");
        if (nome) resultado.add(nome);
      });
    });
    return [...resultado];
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return { db: fs.getFirestore(appMod.getApp()), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function gruposDoProcesso(config, processo) {
    const grupos = config?.grupos && typeof config.grupos === "object" ? config.grupos : {};
    const nome = processoCanonico(processo);
    const chaveExata = slug(nome);
    const encontrados = [];

    Object.entries(grupos).forEach(([chave, grupo]) => {
      const nomeGrupo = processoCanonico(grupo?.processo || chave.replace(/-/g, " "));
      if (chave === chaveExata || nomeGrupo === nome) encontrados.push(grupo || {});
    });

    return encontrados;
  }

  function selecaoVisivelNoGerenciador(processo) {
    const processoGerenciado = processoCanonico(document.getElementById("gfp43Processo")?.value || "");
    if (!processoGerenciado || processoGerenciado !== processoCanonico(processo)) return { ids: [], nomes: [] };

    const inputs = [...document.querySelectorAll("#gfp43Lista [data-gfp43-faccao]:checked")];
    return {
      ids: inputs.map(input => String(input.dataset.gfp43Faccao || "")).filter(Boolean),
      nomes: inputs.map(input => input.closest("label")?.querySelector("strong")?.textContent || "").filter(Boolean)
    };
  }

  async function carregarFaccoesHabilitadas(processo) {
    const nomeProcesso = processoCanonico(processo);
    if (!nomeProcesso) return [];

    const { db, fs } = await contexto();
    const [faccoesSnap, configSnap] = await Promise.all([
      fs.getDocs(fs.collection(db, "faccoes")),
      fs.getDoc(fs.doc(db, "configuracoes", CONFIG_ID))
    ]);

    const faccoes = faccoesSnap.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => item.ativo !== false && !item.cadastroPendente && !item.duplicadaDe && item.statusImportacao !== "duplicada_consolidada");

    const config = configSnap.exists() ? configSnap.data() : {};
    const grupos = gruposDoProcesso(config, nomeProcesso);
    const selecaoDOM = selecaoVisivelNoGerenciador(nomeProcesso);
    const tokensGrupo = new Set();
    let configurado = false;

    grupos.forEach(grupo => {
      if (grupo?.configurado === true) configurado = true;
      [grupo?.faccaoIds, grupo?.faccaoNomes, grupo?.faccoes].forEach(campo => {
        const itens = Array.isArray(campo) ? campo : (campo ? [campo] : []);
        itens.forEach(item => {
          const valor = typeof item === "string" ? item : item?.id || item?.nome || "";
          [String(valor), docIdSeguro(valor), slug(valor), normalizar(valor), nomeCanonico(valor)]
            .filter(Boolean)
            .forEach(token => tokensGrupo.add(token));
        });
      });
    });

    [...selecaoDOM.ids, ...selecaoDOM.nomes].forEach(valor => {
      [String(valor), docIdSeguro(valor), slug(valor), normalizar(valor), nomeCanonico(valor)]
        .filter(Boolean)
        .forEach(token => tokensGrupo.add(token));
    });

    const habilitadas = faccoes.filter(faccao => {
      const vinculadaAoGrupo = [...tokensFaccao(faccao)].some(token => tokensGrupo.has(token));
      const vinculadaNoCadastro = processosDaFaccao(faccao).includes(nomeProcesso);
      return configurado ? (vinculadaAoGrupo || vinculadaNoCadastro) : (vinculadaNoCadastro || vinculadaAoGrupo);
    });

    const unicas = new Map();
    habilitadas.forEach(faccao => {
      const chave = nomeCanonico(faccao.nome);
      if (chave && !unicas.has(chave)) unicas.set(chave, faccao);
    });

    return [...unicas.values()].sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { numeric: true })
    );
  }

  function dominarSelectProcesso() {
    const atual = document.getElementById("s3processo");
    if (!(atual instanceof HTMLSelectElement || atual instanceof HTMLInputElement)) return null;
    if (atual.dataset.grupoSaida45 === "1") return atual;

    const clone = atual.cloneNode(true);
    clone.value = atual.value;
    clone.dataset.grupoSaida45 = "1";
    clone.dataset.gfp43Filtro = "1";
    atual.replaceWith(clone);

    clone.addEventListener("change", () => {
      [0, 180, 500, 1000].forEach(atraso => window.setTimeout(atualizarSelectFaccoes, atraso));
    });
    clone.addEventListener("input", () => {
      [0, 250].forEach(atraso => window.setTimeout(atualizarSelectFaccoes, atraso));
    });
    return clone;
  }

  async function atualizarSelectFaccoes() {
    const processoSelect = dominarSelectProcesso();
    const faccaoSelect = document.getElementById("s3faccao");
    if (!(processoSelect instanceof HTMLSelectElement || processoSelect instanceof HTMLInputElement) || !(faccaoSelect instanceof HTMLSelectElement)) return;

    const processo = processoCanonico(processoSelect.value);
    const minhaSequencia = ++sequencia;

    if (!processo) {
      faccaoSelect.innerHTML = '<option value="">Escolha o processo primeiro</option>';
      faccaoSelect.disabled = true;
      return;
    }

    const valorAnterior = faccaoSelect.value;
    faccaoSelect.disabled = true;
    faccaoSelect.innerHTML = '<option value="">Carregando facções do grupo...</option>';

    try {
      const faccoes = await carregarFaccoesHabilitadas(processo);
      if (minhaSequencia !== sequencia) return;

      faccaoSelect.innerHTML = faccoes.length
        ? '<option value="">Selecione a facção</option>' + faccoes
          .map(faccao => `<option value="${escapar(faccao.nome || "")}">${escapar(faccao.nome || "")}</option>`)
          .join("")
        : '<option value="">Nenhuma facção cadastrada neste processo</option>';
      faccaoSelect.disabled = !faccoes.length;

      const anterior = faccoes.find(item => nomeCanonico(item.nome) === nomeCanonico(valorAnterior));
      if (anterior) faccaoSelect.value = anterior.nome;
    } catch (error) {
      console.error("Não foi possível carregar as facções do processo.", error);
      if (minhaSequencia !== sequencia) return;
      faccaoSelect.innerHTML = '<option value="">Erro ao carregar facções</option>';
      faccaoSelect.disabled = true;
    }
  }

  function prepararFormulario() {
    dominarSelectProcesso();
    const processo = document.getElementById("s3processo");
    if (processo?.value) atualizarSelectFaccoes();
  }

  document.addEventListener("change", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.matches("#s3processo")) return;
    [0, 180, 500, 1000].forEach(atraso => window.setTimeout(atualizarSelectFaccoes, atraso));
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest("#btnSaidaAbas, #btnSaidaCorteNovo")) {
      [80, 300, 700].forEach(atraso => window.setTimeout(prepararFormulario, atraso));
    }

    if (alvo.closest("#s3buscar")) {
      [250, 600, 1100].forEach(atraso => window.setTimeout(prepararFormulario, atraso));
    }
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest("#gfp43Salvar")) return;

    const processo = processoCanonico(document.getElementById("gfp43Processo")?.value || "");
    const marcadas = [...document.querySelectorAll("#gfp43Lista [data-gfp43-faccao]:checked")];
    const ids = marcadas.map(input => String(input.dataset.gfp43Faccao || "")).filter(Boolean);
    const nomes = marcadas.map(input => input.closest("label")?.querySelector("strong")?.textContent || "").filter(Boolean);
    if (!processo) return;

    window.setTimeout(async () => {
      try {
        const { db, fs } = await contexto();
        const ref = fs.doc(db, "configuracoes", CONFIG_ID);
        const snap = await fs.getDoc(ref);
        const config = snap.exists() ? snap.data() : {};
        const grupos = { ...(config.grupos || {}) };
        const chave = slug(processo);
        grupos[chave] = {
          ...(grupos[chave] || {}),
          processo,
          faccaoIds: ids,
          faccaoNomes: nomes,
          configurado: true
        };
        await fs.setDoc(ref, { grupos, versaoSaida: VERSION }, { merge: true });
      } catch (error) {
        console.warn("O grupo foi salvo, mas os nomes complementares não puderam ser gravados.", error);
      }
    }, 1200);
  }, true);
})();