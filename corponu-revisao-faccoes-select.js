(() => {
  "use strict";

  const VERSION = "2026-07-31-revisao-faccoes-select-54";
  const FB = "10.12.5";
  const CONFIG_GRUPOS_ID = "grupos-faccoes-processos";
  const CACHE_MS = 20000;
  const CAMPOS = Object.freeze({
    lateral: {
      checkboxId: "revLateral",
      selectId: "revLateralQuemFez",
      processo: "LATERAL",
      titulo: "Qual facção fez a lateral?"
    },
    bojo: {
      checkboxId: "revBojo",
      selectId: "revBojoQuemFez",
      processo: "ENCAPAR BOJO",
      titulo: "Qual facção fez o bojo?"
    }
  });
  const BOJO_PADRAO = new Set([
    "DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA",
    "DAIANY", "NAGILA", "DELMA", "GIRLAINE"
  ]);

  if (window.__CORPONU_REVISAO_FACCOES_SELECT__ === VERSION) return;
  window.__CORPONU_REVISAO_FACCOES_SELECT__ = VERSION;

  let firebasePromise = null;
  let cache = null;
  let carregandoPromise = null;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

  const processoCanonico = valor => {
    const nome = normalizar(valor);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPA BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "LATERAIS": "LATERAL"
    };
    return aliases[nome] || nome;
  };

  const slug = valor => normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function toast(mensagem) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      window.clearTimeout(window.__revFaccoesSelectToast54);
      window.__revFaccoesSelectToast54 = window.setTimeout(() => principal.classList.add("hidden"), 6000);
      return;
    }
    window.alert(mensagem);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { db: fs.getFirestore(app), fs };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  function processosDaFaccao(faccao) {
    const valores = [];
    const listas = [
      faccao?.processosPermitidos,
      faccao?.processos,
      faccao?.servicosPermitidos,
      faccao?.servicos,
      faccao?.processosFaccao
    ];
    listas.forEach(lista => {
      if (Array.isArray(lista)) valores.push(...lista);
    });
    [
      faccao?.processo,
      faccao?.processoPrincipal,
      faccao?.servico,
      faccao?.servicoNome
    ].forEach(valor => {
      if (valor) valores.push(valor);
    });
    return [...new Set(valores.map(item => processoCanonico(
      typeof item === "string" ? item : item?.nome || item?.processo || item?.servicoNome || ""
    )).filter(Boolean))];
  }

  function faccaoAtiva(faccao) {
    return faccao &&
      faccao.ativo !== false &&
      faccao.cadastroPendente !== true &&
      !faccao.duplicadaDe &&
      faccao.statusImportacao !== "duplicada_consolidada";
  }

  function grupoIds(configuracao, processo) {
    const grupos = configuracao?.grupos && typeof configuracao.grupos === "object"
      ? configuracao.grupos
      : {};
    const chaveEsperada = slug(processo);
    const ids = new Set();

    Object.entries(grupos).forEach(([chave, grupo]) => {
      const corresponde = chave === chaveEsperada || processoCanonico(grupo?.processo) === processoCanonico(processo);
      if (!corresponde) return;
      (Array.isArray(grupo?.faccaoIds) ? grupo.faccaoIds : []).forEach(id => ids.add(String(id)));
    });
    return ids;
  }

  function nomesGlobais(processo) {
    try {
      const retorno = window.getFaccoesGerenciadasPorProcesso?.(processo);
      return Array.isArray(retorno)
        ? retorno.map(item => texto(typeof item === "string" ? item : item?.nome)).filter(Boolean)
        : [];
    } catch (_) {
      return [];
    }
  }

  async function carregarFaccoes(forcar = false) {
    if (!forcar && cache && Date.now() - cache.carregadoEm < CACHE_MS) return cache;
    if (carregandoPromise && !forcar) return carregandoPromise;

    carregandoPromise = (async () => {
      const ctx = await firebase();
      const [faccoesSnap, gruposSnap] = await Promise.all([
        ctx.fs.getDocs(ctx.fs.collection(ctx.db, "faccoes")),
        ctx.fs.getDoc(ctx.fs.doc(ctx.db, "configuracoes", CONFIG_GRUPOS_ID))
      ]);
      const configuracao = gruposSnap.exists() ? gruposSnap.data() : {};
      const faccoes = faccoesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(faccaoAtiva);

      const porProcesso = {};
      Object.values(CAMPOS).forEach(campo => {
        const processo = processoCanonico(campo.processo);
        const idsGrupo = grupoIds(configuracao, processo);
        const nomesExternos = new Set(nomesGlobais(processo).map(normalizar));
        const selecionadas = faccoes.filter(faccao => {
          const nome = normalizar(faccao.nome);
          const vinculada = processosDaFaccao(faccao).includes(processo) || idsGrupo.has(String(faccao.id));
          const externa = nomesExternos.has(nome);
          const fallbackBojo = processo === "ENCAPAR BOJO" && BOJO_PADRAO.has(nome);
          return vinculada || externa || fallbackBojo;
        });

        const mapa = new Map();
        selecionadas.forEach(faccao => {
          const nome = texto(faccao.nome);
          if (!nome) return;
          const chave = normalizar(nome);
          if (!mapa.has(chave)) mapa.set(chave, { id: faccao.id, nome });
        });
        nomesGlobais(processo).forEach(nome => {
          const chave = normalizar(nome);
          if (chave && !mapa.has(chave)) mapa.set(chave, { id: "", nome });
        });
        porProcesso[processo] = [...mapa.values()].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { numeric: true, sensitivity: "base" })
        );
      });

      cache = { carregadoEm: Date.now(), porProcesso };
      return cache;
    })().finally(() => {
      carregandoPromise = null;
    });

    return carregandoPromise;
  }

  function injetarEstilos() {
    if (document.getElementById("styleRevisaoFaccoesSelect54")) return;
    const style = document.createElement("style");
    style.id = "styleRevisaoFaccoesSelect54";
    style.textContent = `
      #revisaoComponentes .rev-responsavel-50 select{width:100%;min-height:42px;margin-top:6px;padding:9px 34px 9px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:700 13px/1.3 inherit;box-sizing:border-box}
      #revisaoComponentes .rev-responsavel-50 select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
      #revisaoComponentes .rev-responsavel-50 select:disabled{background:#f8fafc;color:#64748b;cursor:not-allowed}
      #revisaoComponentes .rev-faccao-select-status-54{display:block;margin-top:5px;color:#64748b;font-size:10px;font-weight:700}
      #revisaoComponentes .rev-faccao-select-status-54.erro{color:#991b1b}
    `;
    document.head.appendChild(style);
  }

  function substituirPorSelect(tipo) {
    const campo = CAMPOS[tipo];
    const atual = document.getElementById(campo.selectId);
    if (!atual) return null;
    if (atual.tagName === "SELECT") return atual;

    const valorAnterior = texto(atual.value);
    const select = document.createElement("select");
    select.id = atual.id;
    select.name = atual.name || atual.id;
    select.className = atual.className;
    select.disabled = atual.disabled;
    select.required = atual.required;
    select.dataset.revisaoFaccaoSelect54 = tipo;
    select.innerHTML = '<option value="">Carregando facções...</option>';
    if (valorAnterior) select.dataset.valorAnterior = valorAnterior;
    atual.replaceWith(select);

    const bloco = select.closest(".rev-responsavel-50");
    const label = bloco?.querySelector(`label[for="${campo.selectId}"]`);
    const ajudaAntiga = bloco?.querySelector("small:not(.rev-faccao-select-status-54)");
    if (label) label.textContent = campo.titulo;
    if (ajudaAntiga) ajudaAntiga.textContent = `Mostra somente facções vinculadas ao processo ${campo.processo}.`;
    if (bloco && !bloco.querySelector(".rev-faccao-select-status-54")) {
      const status = document.createElement("small");
      status.className = "rev-faccao-select-status-54";
      bloco.appendChild(status);
    }
    return select;
  }

  function sincronizarDisponibilidade(tipo) {
    const campo = CAMPOS[tipo];
    const checkbox = document.getElementById(campo.checkboxId);
    const select = document.getElementById(campo.selectId);
    if (!checkbox || !(select instanceof HTMLSelectElement)) return;
    const possuiOpcoes = [...select.options].some(option => option.value);
    select.disabled = !checkbox.checked || !possuiOpcoes;
    select.required = checkbox.checked;
    select.setAttribute("aria-required", checkbox.checked ? "true" : "false");
  }

  function preencherSelect(tipo, itens) {
    const campo = CAMPOS[tipo];
    const select = substituirPorSelect(tipo);
    if (!(select instanceof HTMLSelectElement)) return;

    const valorAtual = texto(select.value || select.dataset.valorAnterior);
    const existeAtual = valorAtual && itens.some(item => normalizar(item.nome) === normalizar(valorAtual));
    const opcoes = ['<option value="">Selecione a facção</option>'];
    itens.forEach(item => {
      opcoes.push(`<option value="${escapar(item.nome)}" data-faccao-id="${escapar(item.id)}">${escapar(item.nome)}</option>`);
    });
    if (valorAtual && !existeAtual) {
      opcoes.push(`<option value="${escapar(valorAtual)}" data-registro-anterior="1">${escapar(valorAtual)} — registro anterior</option>`);
    }
    select.innerHTML = opcoes.join("");
    if (valorAtual) select.value = valorAtual;
    delete select.dataset.valorAnterior;

    const status = select.closest(".rev-responsavel-50")?.querySelector(".rev-faccao-select-status-54");
    if (status) {
      status.classList.toggle("erro", itens.length === 0);
      status.textContent = itens.length
        ? `${itens.length} facção(ões) disponível(is) para ${campo.processo}.`
        : `Nenhuma facção ativa está vinculada ao processo ${campo.processo}.`;
    }
    sincronizarDisponibilidade(tipo);
  }

  async function prepararCampos(forcar = false) {
    injetarEstilos();
    const lateral = substituirPorSelect("lateral");
    const bojo = substituirPorSelect("bojo");
    if (!lateral || !bojo) return false;

    try {
      const dados = await carregarFaccoes(forcar);
      preencherSelect("lateral", dados.porProcesso["LATERAL"] || []);
      preencherSelect("bojo", dados.porProcesso["ENCAPAR BOJO"] || []);
    } catch (error) {
      console.error("Não foi possível carregar as facções da revisão.", error);
      ["lateral", "bojo"].forEach(tipo => {
        const campo = CAMPOS[tipo];
        const select = document.getElementById(campo.selectId);
        if (!(select instanceof HTMLSelectElement)) return;
        const valorAtual = texto(select.value || select.dataset.valorAnterior);
        select.innerHTML = `<option value="${escapar(valorAtual)}">${escapar(valorAtual || "Não foi possível carregar as facções")}</option>`;
        const status = select.closest(".rev-responsavel-50")?.querySelector(".rev-faccao-select-status-54");
        if (status) {
          status.classList.add("erro");
          status.textContent = "Não foi possível carregar a lista agora. Atualize a página e tente novamente.";
        }
        sincronizarDisponibilidade(tipo);
      });
    }
    return true;
  }

  function responsaveisSalvos(op) {
    const revisao = op?.revisaoComponentesConfeccao || {};
    return {
      lateral: texto(
        revisao.lateralFeitaPorNome ||
        revisao.lateralResponsavel ||
        revisao.quemFezLateral ||
        op?.lateralFeitaPorNome ||
        op?.revisaoLateralFeitaPor
      ),
      bojo: texto(
        revisao.bojoFeitoPorNome ||
        revisao.bojoResponsavel ||
        revisao.quemFezBojo ||
        op?.bojoEncapadoPorNome ||
        op?.revisaoBojoFeitoPor
      )
    };
  }

  function garantirOpcaoAnterior(select, valor) {
    const nome = texto(valor);
    if (!(select instanceof HTMLSelectElement) || !nome) return;
    const existente = [...select.options].find(option => normalizar(option.value) === normalizar(nome));
    if (!existente) {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = `${nome} — registro anterior`;
      option.dataset.registroAnterior = "1";
      select.appendChild(option);
    }
    select.value = nome;
  }

  async function aplicarResponsaveisSalvos() {
    const numero = texto(document.getElementById("revNumeroOP")?.value);
    const api = window.CorpoNuRevisaoComponentes;
    if (!numero || typeof api?.buscarOP !== "function") return;
    try {
      const op = await api.buscarOP(numero);
      if (!op) return;
      const salvos = responsaveisSalvos(op);
      garantirOpcaoAnterior(document.getElementById(CAMPOS.lateral.selectId), salvos.lateral);
      garantirOpcaoAnterior(document.getElementById(CAMPOS.bojo.selectId), salvos.bojo);
      sincronizarDisponibilidade("lateral");
      sincronizarDisponibilidade("bojo");
    } catch (error) {
      console.warn("Não foi possível restaurar a facção já registrada na revisão.", error);
    }
  }

  function validarSeletores(event) {
    for (const tipo of ["lateral", "bojo"]) {
      const campo = CAMPOS[tipo];
      const marcado = document.getElementById(campo.checkboxId)?.checked === true;
      const select = document.getElementById(campo.selectId);
      if (!marcado) continue;
      if (!(select instanceof HTMLSelectElement) || !texto(select.value)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const mensagem = select && ![...select.options].some(option => option.value)
          ? `Cadastre ou vincule uma facção ao processo ${campo.processo} antes de salvar.`
          : `Selecione qual facção fez ${tipo === "lateral" ? "a lateral" : "o bojo"}.`;
        toast(mensagem);
        select?.focus();
        return false;
      }
    }
    return true;
  }

  function instalarEventosFormulario() {
    const form = document.getElementById("formRevisaoComponentes");
    if (form && form.dataset.revisaoFaccoesSelect54 !== "1") {
      form.dataset.revisaoFaccoesSelect54 = "1";
      form.addEventListener("submit", validarSeletores, true);
    }
  }

  function programarPreparacao(forcar = false) {
    [0, 180, 550, 1100].forEach(atraso => window.setTimeout(() => {
      prepararCampos(forcar).catch(() => {});
      instalarEventosFormulario();
    }, atraso));
    [320, 720, 1350].forEach(atraso => window.setTimeout(() => {
      aplicarResponsaveisSalvos().catch(() => {});
    }, atraso));
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest('[data-page="revisao-componentes"]')) programarPreparacao(true);
    if (alvo.closest("#btnBuscarRevOP,[data-editar-rev]")) programarPreparacao(false);
    if (alvo.closest("#btnLimparRev")) {
      window.setTimeout(() => {
        ["lateral", "bojo"].forEach(tipo => {
          const select = document.getElementById(CAMPOS[tipo].selectId);
          if (select instanceof HTMLSelectElement) select.value = "";
          sincronizarDisponibilidade(tipo);
        });
      }, 0);
    }
  }, true);

  document.addEventListener("change", event => {
    const id = event.target?.id;
    if (id === "revLateral" || id === "revBojo") {
      window.setTimeout(() => sincronizarDisponibilidade(id === "revLateral" ? "lateral" : "bojo"), 0);
    }
  }, true);

  function iniciar() {
    injetarEstilos();
    programarPreparacao(false);
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      prepararCampos(false).catch(() => {});
      instalarEventosFormulario();
      if (tentativas >= 30) window.clearInterval(intervalo);
    }, 350);
    window.addEventListener("pageshow", () => programarPreparacao(false));
    window.addEventListener("focus", () => {
      if (document.getElementById("revisaoComponentes")?.classList.contains("active")) programarPreparacao(true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
