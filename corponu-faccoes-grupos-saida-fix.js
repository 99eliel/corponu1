(() => {
  "use strict";

  const VERSION = "2026-07-31-faccoes-grupos-saida-44";
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

  function processosDaFaccao(faccao) {
    const campos = [
      faccao?.processosPermitidos,
      faccao?.processos,
      faccao?.servicosPermitidos,
      faccao?.servicos,
      faccao?.processo
    ];
    const lista = [];
    campos.forEach(campo => {
      const itens = Array.isArray(campo) ? campo : (campo ? [campo] : []);
      itens.forEach(item => {
        const nome = processoCanonico(typeof item === "string" ? item : item?.nome || item?.processo || item?.servicoNome || "");
        if (nome) lista.push(nome);
      });
    });
    return [...new Set(lista)];
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

  async function carregarFaccoesHabilitadas(processo) {
    const nomeProcesso = processoCanonico(processo);
    if (!nomeProcesso) return [];
    const { db, fs } = await contexto();
    const [faccoesSnap, configSnap] = await Promise.all([
      fs.getDocs(fs.collection(db, "faccoes")),
      fs.getDoc(fs.doc(db, "configuracoes", CONFIG_ID))
    ]);

    const faccoes = faccoesSnap.docs.map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => item.ativo !== false && !item.cadastroPendente && !item.duplicadaDe && item.statusImportacao !== "duplicada_consolidada");

    const config = configSnap.exists() ? configSnap.data() : {};
    const grupo = config?.grupos?.[slug(nomeProcesso)] || null;
    const idsGrupo = new Set((Array.isArray(grupo?.faccaoIds) ? grupo.faccaoIds : []).map(String));
    const nomesGrupo = new Set((Array.isArray(grupo?.faccaoNomes) ? grupo.faccaoNomes : []).map(nomeCanonico));

    const habilitadas = faccoes.filter(faccao => {
      const porId = idsGrupo.has(String(faccao.id));
      const porIdDerivado = idsGrupo.has(docIdSeguro(faccao.nome));
      const porNome = nomesGrupo.has(nomeCanonico(faccao.nome));
      const porCadastro = processosDaFaccao(faccao).includes(nomeProcesso);

      if (grupo?.configurado === true) return porId || porIdDerivado || porNome || porCadastro;
      return porCadastro || porId || porIdDerivado || porNome;
    });

    const mapa = new Map();
    habilitadas.forEach(faccao => {
      const chave = nomeCanonico(faccao.nome);
      if (!chave || mapa.has(chave)) return;
      mapa.set(chave, faccao);
    });

    return [...mapa.values()].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { numeric: true }));
  }

  async function atualizarSelect() {
    const processoSelect = document.getElementById("s3processo");
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
    faccaoSelect.innerHTML = '<option value="">Carregando facções habilitadas...</option>';

    try {
      const faccoes = await carregarFaccoesHabilitadas(processo);
      if (minhaSequencia !== sequencia) return;
      faccaoSelect.innerHTML = faccoes.length
        ? '<option value="">Selecione a facção</option>' + faccoes.map(faccao => `<option value="${escapar(faccao.nome || "")}">${escapar(faccao.nome || "")}</option>`).join("")
        : '<option value="">Nenhuma facção habilitada para este processo</option>';
      faccaoSelect.disabled = !faccoes.length;
      const encontrada = faccoes.find(item => nomeCanonico(item.nome) === nomeCanonico(valorAnterior));
      if (encontrada) faccaoSelect.value = encontrada.nome;
    } catch (error) {
      console.error("Não foi possível carregar as facções habilitadas do processo.", error);
      if (minhaSequencia !== sequencia) return;
      faccaoSelect.innerHTML = '<option value="">Erro ao carregar facções</option>';
      faccaoSelect.disabled = true;
    }
  }

  document.addEventListener("change", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.matches("#s3processo")) return;
    window.setTimeout(atualizarSelect, 0);
    window.setTimeout(atualizarSelect, 180);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("#s3buscar")) {
      window.setTimeout(atualizarSelect, 350);
      window.setTimeout(atualizarSelect, 850);
    }
    if (alvo.closest("#btnSaidaAbas, #btnSaidaCorteNovo")) {
      window.setTimeout(() => {
        const processo = document.getElementById("s3processo");
        if (processo?.value) atualizarSelect();
      }, 500);
    }
  }, true);
})();