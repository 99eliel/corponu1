(() => {
  "use strict";

  const VERSION = "2026-09-10-faccao-cadastro-processos-309";
  const FB = "10.12.5";
  const CONFIG_ID = "grupos-faccoes-processos";
  const FORM_ID = "formFaccao";
  const BOTAO_ABRIR_ID = "btnAbrirCadastroFaccao";
  const BOTAO_CANCELAR_ID = "btnCancelarFaccao";
  const MODAL_ID = "modalCadastroFaccao63";
  const TITULO_ID = "tituloModalFaccao63";
  const SUBTITULO_ID = "subtituloModalFaccao63";
  const CORPO_ID = "corpoModalFaccao63";
  const CLASSE_FECHADO = "cn63-faccao-form-fechado";

  const PROCESSOS_META = Object.freeze({
    "ENCAPAR BOJO": { sutia: true, calcinha: false },
    "ALÇA": { sutia: true, calcinha: false },
    "LATERAL": { sutia: true, calcinha: false },
    "INTERLOCK": { sutia: true, calcinha: true },
    "SUTIÃ MONTAGEM": { sutia: true, calcinha: false },
    "SUTIÃ COMPLETO": { sutia: true, calcinha: false },
    "CALCINHA MONTAGEM": { sutia: false, calcinha: true },
    "CALCINHA COMPLETA": { sutia: false, calcinha: true }
  });

  const FACCOES_PADRAO = Object.freeze({
    "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
    "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
    "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
    "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
    "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
    "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
  });

  if (window.__CORPONU_FACCAO_EDICAO_MODAL__ === VERSION) return;
  window.__CORPONU_FACCAO_EDICAO_MODAL__ = VERSION;

  let formularioAberto = false;
  let modoAtual = "cadastro";
  let elementoFocoAnterior = null;
  let scrollAntesDeAbrir = 0;
  let tentativas = 0;
  let intervalo = null;
  let contextoPromise = null;
  let salvando = false;

  const limparTexto = valor => String(valor ?? "").trim().replace(/\s+/g, " ");
  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const processoCanonico = valor => ({
    BOJO: "ENCAPAR BOJO",
    ENCAPAR: "ENCAPAR BOJO",
    "ENCAPA BOJO": "ENCAPAR BOJO",
    "ENCAPAR BOJOS": "ENCAPAR BOJO",
    ALCA: "ALÇA",
    ALCAS: "ALÇA",
    "ALÇAS": "ALÇA",
    "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
    "SUTIA COMPLETO": "SUTIÃ COMPLETO",
    "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
    "CALCINHA PRONTA": "CALCINHA COMPLETA"
  })[normalizar(valor)] || normalizar(valor);

  const slug = valor => normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "processo";

  const docIdSeguro = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 180) || `faccao-${Date.now()}`;

  const nomeFaccaoCanonico = valor => ({
    "LARA CRISTINA KAKA": "KAKA",
    "LARA CRISTINA (KAKA)": "KAKA",
    "LARA CRISTINA/KAKA": "KAKA",
    GISLAINE: "GISLAINY"
  })[normalizar(valor)] || normalizar(valor);

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
        const nome = processoCanonico(typeof item === "string" ? item : item?.nome || item?.processo || item?.servicoNome || item?.label || "");
        if (nome) processos.add(nome);
      });
    });
    return [...processos];
  }

  function injetarEstilo() {
    if (document.getElementById("styleFaccaoEdicaoModal63")) return;
    const style = document.createElement("style");
    style.id = "styleFaccaoEdicaoModal63";
    style.textContent = `
      #${FORM_ID}.${CLASSE_FECHADO}{display:none!important}
      body.cn63-modal-faccao-aberto{overflow:hidden!important}
      #${MODAL_ID}{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .cn63-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(2px)}
      #${MODAL_ID} .cn63-card{position:relative;z-index:1;width:min(1060px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #d8b4fe;border-radius:20px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.35);animation:cn63Abrir .18s ease-out}
      #${MODAL_ID} .cn63-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#faf5ff,#fff)}
      #${MODAL_ID} .cn63-header h3{margin:0;color:#3b0764;font-size:20px;line-height:1.2}
      #${MODAL_ID} .cn63-header p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.45}
      #${MODAL_ID} .cn63-fechar{flex:0 0 auto;width:38px;height:38px;border:1px solid #ddd6fe;border-radius:50%;background:#fff;color:#4c1d95;font-size:22px;font-weight:900;line-height:1;cursor:pointer}
      #${MODAL_ID} .cn63-fechar:hover{background:#f3e8ff}
      #${CORPO_ID}{padding:18px 20px 22px;overflow:auto;overscroll-behavior:contain}
      #${CORPO_ID} #${FORM_ID}{display:grid!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;animation:none!important}
      #${CORPO_ID} #${FORM_ID}.hidden:not(.${CLASSE_FECHADO}){display:grid!important}
      #${CORPO_ID} #${FORM_ID} .actions{position:sticky;bottom:-22px;z-index:3;margin:8px -20px -22px;padding:14px 20px;border-top:1px solid #e2e8f0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px)}
      @keyframes cn63Abrir{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @media(max-width:760px){#${MODAL_ID}{padding:8px;align-items:stretch}#${MODAL_ID} .cn63-card{width:100%;max-height:100%;border-radius:15px}#${MODAL_ID} .cn63-header{padding:15px}#${CORPO_ID}{padding:14px 14px 18px}#${CORPO_ID} #${FORM_ID} .actions{bottom:-18px;margin:8px -14px -18px;padding:12px 14px}}
    `;
    document.head.appendChild(style);
  }

  const formulario = () => document.getElementById(FORM_ID);
  const modal = () => document.getElementById(MODAL_ID);

  function criarModal() {
    let existente = modal();
    if (existente) return existente;
    existente = document.createElement("div");
    existente.id = MODAL_ID;
    existente.className = "hidden";
    existente.setAttribute("aria-hidden", "true");
    existente.innerHTML = `
      <div class="cn63-backdrop" data-fechar-modal-faccao63="1"></div>
      <section class="cn63-card" role="dialog" aria-modal="true" aria-labelledby="${TITULO_ID}" aria-describedby="${SUBTITULO_ID}">
        <header class="cn63-header"><div><h3 id="${TITULO_ID}">Cadastrar facção</h3><p id="${SUBTITULO_ID}">Preencha os dados e marque os processos que esta facção realiza.</p></div><button type="button" class="cn63-fechar" data-fechar-modal-faccao63="1" aria-label="Fechar">×</button></header>
        <div id="${CORPO_ID}"></div>
      </section>`;
    document.body.appendChild(existente);
    return existente;
  }

  function moverFormularioParaModal() {
    const form = formulario();
    const corpo = document.getElementById(CORPO_ID);
    if (!form || !corpo) return false;
    if (form.parentElement !== corpo) corpo.appendChild(form);
    return true;
  }

  function limparCamposCadastro() {
    const form = formulario();
    if (!form) return;
    [...form.elements].forEach(campo => {
      if (!(campo instanceof HTMLElement)) return;
      if (campo instanceof HTMLInputElement) {
        if (["checkbox", "radio"].includes(campo.type)) campo.checked = false;
        else if (campo.type !== "button" && campo.type !== "submit") campo.value = "";
      } else if (campo instanceof HTMLTextAreaElement) campo.value = "";
      else if (campo instanceof HTMLSelectElement) campo.selectedIndex = 0;
    });
    const id = document.getElementById("faccaoId");
    if (id) id.value = "";
  }

  function atualizarCabecalho(edicao) {
    const titulo = document.getElementById(TITULO_ID);
    const subtitulo = document.getElementById(SUBTITULO_ID);
    const nome = String(document.getElementById("faccaoNome")?.value || "").trim();
    if (titulo) titulo.textContent = edicao ? `Editar facção${nome ? ` — ${nome}` : ""}` : "Cadastrar facção";
    if (subtitulo) subtitulo.textContent = edicao
      ? "Altere os dados ou processos e salve. O cadastro e os vínculos serão atualizados juntos."
      : "Preencha os dados e marque os processos que esta facção realiza.";
  }

  function fechar({ limpar = false, restaurarFoco = true } = {}) {
    const form = formulario();
    const caixa = modal();
    if (!form || !caixa) return false;
    formularioAberto = false;
    form.classList.add(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "true");
    caixa.classList.add("hidden");
    caixa.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cn63-modal-faccao-aberto");
    if (limpar) limparCamposCadastro();
    if (restaurarFoco && elementoFocoAnterior instanceof HTMLElement) window.setTimeout(() => elementoFocoAnterior?.focus?.({ preventScroll: true }), 0);
    return true;
  }

  function abrir({ edicao = false, scrollOriginal = null } = {}) {
    const form = formulario();
    const caixa = modal();
    if (!form || !caixa) return false;
    formularioAberto = true;
    modoAtual = edicao ? "edicao" : "cadastro";
    if (Number.isFinite(scrollOriginal)) scrollAntesDeAbrir = scrollOriginal;
    form.classList.remove(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "false");
    form.dataset.cn63Modo = modoAtual;
    caixa.classList.remove("hidden");
    caixa.setAttribute("aria-hidden", "false");
    document.body.classList.add("cn63-modal-faccao-aberto");
    atualizarCabecalho(edicao);
    if (Number.isFinite(scrollAntesDeAbrir)) window.scrollTo({ top: scrollAntesDeAbrir, left: 0, behavior: "auto" });
    window.setTimeout(() => document.getElementById("faccaoNome")?.focus({ preventScroll: true }), 60);
    return true;
  }

  function abrirEdicaoAposPreenchimento(scrollOriginal) {
    [0, 60, 160].forEach(atraso => window.setTimeout(() => {
      abrir({ edicao: true, scrollOriginal });
      atualizarCabecalho(true);
      window.scrollTo({ top: scrollOriginal, left: 0, behavior: "auto" });
    }, atraso));
  }

  function mostrarToast(mensagem) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      window.clearTimeout(window.__cn309Toast);
      window.__cn309Toast = window.setTimeout(() => principal.classList.add("hidden"), 6000);
      return;
    }
    window.alert(mensagem);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    if (auth.currentUser) return auth.currentUser;
    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
      if (auth.currentUser) return auth.currentUser;
    }
    throw new Error("Usuário ainda não autenticado.");
  }

  function processosSelecionadosNoFormulario() {
    const inputs = [...document.querySelectorAll("#gfp43FormGrupos [data-gfp43-processo]")];
    return {
      disponivel: inputs.length > 0,
      selecionados: [...new Set(inputs.filter(input => input.checked).map(input => processoCanonico(input.dataset.gfp43Processo)).filter(Boolean))]
    };
  }

  function classificacaoProcessos(processos) {
    let sutia = false;
    let calcinha = false;
    processos.forEach(processo => {
      const nome = processoCanonico(processo);
      const meta = PROCESSOS_META[nome];
      if (meta) {
        sutia ||= meta.sutia;
        calcinha ||= meta.calcinha;
        return;
      }
      const texto = normalizar(nome);
      sutia ||= /SUTIA|BOJO|ALCA|LATERAL/.test(texto);
      calcinha ||= texto.includes("CALCINHA");
      if (!/SUTIA|BOJO|ALCA|LATERAL|CALCINHA/.test(texto)) {
        sutia = true;
        calcinha = true;
      }
    });
    return { sutia, calcinha };
  }

  function idsDerivadosDoGrupo(processo, faccoes) {
    const canonico = processoCanonico(processo);
    const nomesPadrao = new Set((FACCOES_PADRAO[canonico] || []).map(nomeFaccaoCanonico));
    return faccoes
      .filter(faccao => faccao.ativo !== false && !faccao.cadastroPendente && !faccao.duplicadaDe)
      .filter(faccao => processosDaFaccao(faccao).includes(canonico) || nomesPadrao.has(nomeFaccaoCanonico(faccao.nome)))
      .map(faccao => faccao.id);
  }

  async function registrarLogSeguro(fs, db, usuario, id, nome, processos, edicao) {
    try {
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: edicao ? "faccao_atualizada" : "faccao_criada",
        tipoAlvo: "faccao",
        alvoId: id,
        detalhes: `${nome} | Processos: ${processos.join(", ") || "nenhum"}`,
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Facção salva, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarCadastroCompleto(event) {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== FORM_ID) return;

    // Captura antes dos listeners antigos do próprio formulário: um único salvamento
    // passa a ser responsável pelos dados cadastrais e pelos vínculos de processos.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (salvando) return;

    const nome = limparTexto(document.getElementById("faccaoNome")?.value || "").toUpperCase();
    const cidade = limparTexto(document.getElementById("faccaoCidade")?.value || "").toUpperCase();
    const chavePix = String(document.getElementById("faccaoPix")?.value || "").trim();
    const celular = String(document.getElementById("faccaoCelular")?.value || "").trim();
    const observacoes = String(document.getElementById("faccaoObs")?.value || "").trim();
    const idAtual = String(document.getElementById("faccaoId")?.value || "").trim();

    if (!nome || !cidade) {
      mostrarToast("Informe nome da facção e cidade.");
      return;
    }

    const botaoSalvar = event.target.querySelector('button[type="submit"]');
    const textoAnterior = botaoSalvar?.textContent || "Salvar facção";
    salvando = true;
    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
    }

    try {
      const { auth, db, fs } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const perfilSnap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
      if (normalizar(perfil.tipo) !== "ADMIN" || perfil.ativo === false) {
        mostrarToast("Apenas admin pode salvar facções.");
        return;
      }

      const id = idAtual || docIdSeguro(nome);
      const faccaoRef = fs.doc(db, "faccoes", id);
      const configRef = fs.doc(db, "configuracoes", CONFIG_ID);
      const [faccaoSnap, configSnap, faccoesSnap] = await Promise.all([
        fs.getDoc(faccaoRef),
        fs.getDoc(configRef),
        fs.getDocs(fs.collection(db, "faccoes"))
      ]);

      const anterior = faccaoSnap.exists() ? { id, ...faccaoSnap.data() } : null;
      const processosAnteriores = processosDaFaccao(anterior || {});
      const controle = processosSelecionadosNoFormulario();
      const processos = (controle.disponivel ? controle.selecionados : processosAnteriores)
        .map(processoCanonico)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      const { sutia, calcinha } = classificacaoProcessos(processos);

      const config = configSnap.exists() ? configSnap.data() : {};
      const grupos = { ...(config.grupos || {}) };
      const faccoes = faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() }));
      const tocados = new Set([...processosAnteriores, ...processos]);

      tocados.forEach(processo => {
        const canonico = processoCanonico(processo);
        const chave = slug(canonico);
        const salvo = grupos[chave];
        const baseIds = Array.isArray(salvo?.faccaoIds) ? salvo.faccaoIds : idsDerivadosDoGrupo(canonico, faccoes);
        const ids = new Set(baseIds);
        if (processos.includes(canonico)) ids.add(id);
        else ids.delete(id);
        grupos[chave] = { processo: canonico, faccaoIds: [...ids], configurado: true };
      });

      const dadosFaccao = {
        nome,
        cidade,
        chavePix,
        celular,
        observacoes,
        ativo: true,
        cadastroPendente: false,
        statusImportacao: "ok",
        pendenciaImportacao: "",
        processosPermitidos: processos,
        trabalhaSutia: sutia,
        trabalhaCalcinha: calcinha,
        gruposPermitidos: [sutia ? "SUTIÃ" : "", calcinha ? "CALCINHA" : ""].filter(Boolean),
        atualizadoPor: usuario.uid,
        atualizadoEm: fs.serverTimestamp(),
        versaoCadastroProcessos: VERSION
      };

      const batch = fs.writeBatch(db);
      batch.set(faccaoRef, dadosFaccao, { merge: true });
      batch.set(configRef, {
        grupos,
        atualizadoPor: usuario.uid,
        atualizadoEm: fs.serverTimestamp(),
        versao: VERSION
      }, { merge: true });
      await batch.commit();

      await registrarLogSeguro(fs, db, usuario, id, nome, processos, Boolean(idAtual));

      document.dispatchEvent(new CustomEvent("corponu:faccao-salva", {
        detail: { id, nome, processos, versao: VERSION }
      }));

      const apiGrupos = window.CorpoNuFaccoesGrupos;
      if (apiGrupos?.atualizar) {
        Promise.resolve(apiGrupos.atualizar(true)).catch(error => console.warn("Facção salva, mas a atualização visual dos grupos falhou.", error));
      }

      mostrarToast(`Facção ${nome} salva com ${processos.length} processo(s).`);
    } catch (error) {
      console.error("Erro ao salvar facção e processos de forma unificada.", error);
      mostrarToast("Erro ao salvar facção. Nenhuma alteração parcial foi aplicada.");
    } finally {
      salvando = false;
      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoAnterior;
      }
    }
  }

  function preparar() {
    injetarEstilo();
    criarModal();
    const form = formulario();
    if (!form || !moverFormularioParaModal()) return false;
    if (form.dataset.cn63Preparado !== "1") {
      form.dataset.cn63Preparado = "1";
      fechar({ restaurarFoco: false });
      form.addEventListener("reset", () => window.setTimeout(() => fechar({ restaurarFoco: true }), 0));
      form.addEventListener("input", event => {
        if (modoAtual === "edicao" && event.target?.id === "faccaoNome") atualizarCabecalho(true);
      });
    }
    return true;
  }

  function instalarEventosGlobais() {
    // O submit é capturado no document antes de alcançar os listeners legados do form.
    document.addEventListener("submit", salvarCadastroCompleto, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest(`#${BOTAO_ABRIR_ID}`)) {
        elementoFocoAnterior = alvo.closest("button") || document.activeElement;
        const scrollOriginal = window.scrollY;
        window.setTimeout(() => {
          scrollAntesDeAbrir = scrollOriginal;
          limparCamposCadastro();
          abrir({ edicao: false, scrollOriginal });
        }, 0);
        return;
      }

      const editar = alvo.closest('[onclick*="editarFaccao"],[data-editar-faccao]');
      if (editar) {
        elementoFocoAnterior = editar;
        const scrollOriginal = window.scrollY;
        scrollAntesDeAbrir = scrollOriginal;
        abrirEdicaoAposPreenchimento(scrollOriginal);
        return;
      }

      if (alvo.closest("[data-fechar-modal-faccao63]")) {
        event.preventDefault();
        fechar({ limpar: modoAtual === "cadastro" });
        return;
      }

      if (alvo.closest(`#${BOTAO_CANCELAR_ID}`)) {
        window.setTimeout(() => fechar({ limpar: true }), 0);
        return;
      }

      const navegacao = alvo.closest('.nav-btn[data-page]');
      if (navegacao && navegacao.dataset.page !== "faccoes") fechar({ restaurarFoco: false });
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !formularioAberto) return;
      event.preventDefault();
      fechar({ limpar: modoAtual === "cadastro" });
    });

    document.addEventListener("corponu:faccao-salva", () => fechar({ limpar: true }));
  }

  function iniciar() {
    instalarEventosGlobais();
    preparar();
    intervalo = window.setInterval(() => {
      tentativas += 1;
      const pronto = preparar();
      if (pronto || tentativas >= 30) {
        window.clearInterval(intervalo);
        intervalo = null;
      }
    }, 300);
    window.addEventListener("pageshow", () => {
      preparar();
      if (!formularioAberto) fechar({ restaurarFoco: false });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
