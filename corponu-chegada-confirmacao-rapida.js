(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-confirmacao-final-83";
  const FIREBASE_VERSION = "10.12.5";
  const FORM_ID = "formChegadaMovimentacao";
  const MODAL_CHEGADA_ID = "modalChegadaMovimentacao";
  const INFO_ID = "chegadaMovimentacaoInfo";
  const MODAL_CONFIRMACAO_ID = "modalConfirmacaoChegada83";
  const PROCESSO_ID = "confirmacaoChegadaProcesso83";
  const FACCAO_ID = "confirmacaoChegadaFaccao83";
  const RESUMO_ID = "confirmacaoChegadaResumo83";
  const ERRO_ID = "confirmacaoChegadaErro83";
  const BTN_CONFIRMAR_ID = "btnConfirmarCorrecaoChegada83";
  const BTN_CANCELAR_ID = "btnCancelarCorrecaoChegada83";
  const BTN_FECHAR_ID = "btnFecharCorrecaoChegada83";

  const PROCESSOS_FACCOES = Object.freeze({
    "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
    "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
    "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
    "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
    "LATERAL": [],
    "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
    "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
  });

  if (window.__CORPONU_CHEGADA_CONFIRMACAO_FINAL_83__ === VERSION) return;
  window.__CORPONU_CHEGADA_CONFIRMACAO_FINAL_83__ = VERSION;

  window.__CORPONU_CHEGADA_CORRECAO_79__ = "2026-08-01-chegada-correcao-processo-faccao-79";
  window.__CN_CHEGADA_RAPIDA80__ = "2026-08-01-chegada-correcao-rapida-80";
  window.__CN_CHEGADA_UNICA_81__ = "2026-08-01-chegada-unica-rapida-81";
  window.__CN_CHEGADA_ESTAVEL_82__ = "2026-08-01-chegada-sem-travamento-82";
  window.__CORPONU_CHEGADA_CONFIRMACAO__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO_DEFINITIVA__ = VERSION;

  const IDS_PAINEIS_ANTIGOS = [
    "sf71ConfirmacaoServico",
    "sf73ConfirmacaoServico",
    "corponuConfirmacaoChegada75",
    "corponuChegadaConfirmacao76",
    "corponuConfirmacaoChegada77",
    "corponuConfirmacaoChegada78",
    "corponuConfirmacaoChegada79",
    "cnChegadaRapida80",
    "cnChegadaUnica81",
    "cnChegadaEstavel82"
  ];

  const IDS_ESTILOS_ANTIGOS = [
    "styleChegadaConfirmacaoSegura71",
    "styleChegadaConfirmacaoBotoes73",
    "corponuStyleConfirmacaoChegada75",
    "styleCorponuChegadaConfirmacao75",
    "styleCorponuChegadaConfirmacao76",
    "styleCorponuConfirmacaoChegada77",
    "styleCorponuConfirmacaoChegada78",
    "styleCorponuConfirmacaoChegada79",
    "cnChegadaRapida80Style",
    "cnChegadaUnica81Style",
    "cnChegadaEstavel82Style"
  ];

  let contextoPromise = null;
  let formPendente = null;
  let movimentoPendente = null;
  let carregandoFaccoes = false;
  let cacheFaccoesRemotas = null;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const unicosOrdenados = valores => [...new Map(
    (Array.isArray(valores) ? valores : [])
      .map(texto)
      .filter(Boolean)
      .map(valor => [normalizar(valor), valor])
  ).values()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  function removerInterfaceAntiga() {
    IDS_PAINEIS_ANTIGOS.forEach(id => document.getElementById(id)?.remove());
    IDS_ESTILOS_ANTIGOS.forEach(id => document.getElementById(id)?.remove());

    const form = document.getElementById(FORM_ID);
    if (!form) return;

    [...form.children].forEach(elemento => {
      const conteudo = normalizar(elemento.textContent);
      if (
        conteudo.includes("CONFIRMACAO OBRIGATORIA DA CHEGADA") ||
        conteudo.includes("CONFERENCIA E CORRECAO OBRIGATORIA DA CHEGADA")
      ) {
        elemento.remove();
      }
    });
  }

  function instalarEstilo() {
    if (document.getElementById("styleConfirmacaoFinalChegada83")) return;

    const style = document.createElement("style");
    style.id = "styleConfirmacaoFinalChegada83";
    style.textContent = `
      #${MODAL_CONFIRMACAO_ID}{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.58)}
      #${MODAL_CONFIRMACAO_ID}.hidden{display:none!important}
      #${MODAL_CONFIRMACAO_ID} .cc83-card{width:min(520px,100%);max-height:calc(100vh - 36px);overflow:auto;border-radius:20px;background:#fff;box-shadow:0 30px 80px rgba(15,23,42,.34)}
      #${MODAL_CONFIRMACAO_ID} .cc83-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #e2e8f0}
      #${MODAL_CONFIRMACAO_ID} .cc83-head h3{margin:0;color:#111827;font-size:19px}
      #${MODAL_CONFIRMACAO_ID} .cc83-head p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.45}
      #${MODAL_CONFIRMACAO_ID} .cc83-close{width:38px;height:38px;border:0;border-radius:12px;background:#eef2ff;color:#111827;font-size:24px;font-weight:900;cursor:pointer}
      #${MODAL_CONFIRMACAO_ID} .cc83-body{padding:18px 20px 20px}
      #${MODAL_CONFIRMACAO_ID} .cc83-current{margin-bottom:14px;padding:11px 12px;border:1px solid #ddd6fe;border-radius:12px;background:#faf8ff;color:#5b21b6;font-size:12px;font-weight:900;line-height:1.45}
      #${MODAL_CONFIRMACAO_ID} label{display:block;margin:0 0 14px;color:#334155;font-size:12px;font-weight:900}
      #${MODAL_CONFIRMACAO_ID} select{width:100%;min-height:48px;margin-top:7px;padding:0 13px;border:1px solid #a78bfa;border-radius:12px;background:#fff;color:#111827;font-size:14px;font-weight:800}
      #${MODAL_CONFIRMACAO_ID} select:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed}
      #${MODAL_CONFIRMACAO_ID} .cc83-help{margin:-4px 0 14px;color:#64748b;font-size:11px;line-height:1.45}
      #${MODAL_CONFIRMACAO_ID} .cc83-error{margin:0 0 14px;padding:10px 12px;border-radius:11px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:800}
      #${MODAL_CONFIRMACAO_ID} .cc83-error.hidden{display:none!important}
      #${MODAL_CONFIRMACAO_ID} .cc83-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
      #${MODAL_CONFIRMACAO_ID} .cc83-btn{min-height:43px;padding:0 16px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#111827;font-weight:900;cursor:pointer}
      #${MODAL_CONFIRMACAO_ID} .cc83-btn-primary{border-color:#7c3aed;background:#7c3aed;color:#fff}
      #${MODAL_CONFIRMACAO_ID} .cc83-btn:disabled{opacity:.55;cursor:not-allowed}
      body.cc83-aberto{overflow:hidden}
      body.cc83-aberto #toast,
      body.cc83-aberto #toastAtualizacaoSistema,
      body.cc83-aberto #corponuToastAtualizacaoAutomatica,
      body.cc83-aberto #toastAtualizadorCorpoNu{pointer-events:none!important}
    `;
    document.head.appendChild(style);
  }

  function garantirModalConfirmacao() {
    let modal = document.getElementById(MODAL_CONFIRMACAO_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_CONFIRMACAO_ID;
    modal.className = "hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="cc83-card">
        <div class="cc83-head">
          <div>
            <h3>Confirmar processo e facção</h3>
            <p>Esta verificação aparece somente agora, antes de concluir a chegada e calcular o pagamento.</p>
          </div>
          <button class="cc83-close" id="${BTN_FECHAR_ID}" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="cc83-body">
          <div class="cc83-current" id="${RESUMO_ID}">Movimentação selecionada</div>

          <label>
            1. Processo realmente realizado
            <select id="${PROCESSO_ID}">
              <option value="">Selecione o processo</option>
            </select>
          </label>

          <p class="cc83-help">Depois de escolher o processo, o sistema mostrará somente as facções que realizam esse serviço.</p>

          <label>
            2. Quem fez / facção
            <select id="${FACCAO_ID}" disabled>
              <option value="">Selecione o processo primeiro</option>
            </select>
          </label>

          <div class="cc83-error hidden" id="${ERRO_ID}"></div>

          <div class="cc83-actions">
            <button class="cc83-btn" id="${BTN_CANCELAR_ID}" type="button">Voltar</button>
            <button class="cc83-btn cc83-btn-primary" id="${BTN_CONFIRMAR_ID}" type="button">Confirmar operação</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById(PROCESSO_ID)?.addEventListener("change", selecionarProcesso);
    document.getElementById(BTN_CONFIRMAR_ID)?.addEventListener("click", confirmarOperacao);
    document.getElementById(BTN_CANCELAR_ID)?.addEventListener("click", fecharConfirmacao);
    document.getElementById(BTN_FECHAR_ID)?.addEventListener("click", fecharConfirmacao);

    modal.addEventListener("click", event => {
      if (event.target === modal) fecharConfirmacao();
    });

    return modal;
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;

    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, firestore]) => {
      const app = appMod.getApp();
      return {
        auth: authMod.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });

    return contextoPromise;
  }

  function mostrarErro(mensagem) {
    const erro = document.getElementById(ERRO_ID);
    if (!erro) return;
    erro.textContent = mensagem;
    erro.classList.remove("hidden");
  }

  function limparErro() {
    const erro = document.getElementById(ERRO_ID);
    if (!erro) return;
    erro.textContent = "";
    erro.classList.add("hidden");
  }

  function preencherSelect(select, placeholder, valores, desabilitado = false) {
    if (!(select instanceof HTMLSelectElement)) return;

    select.replaceChildren(
      new Option(placeholder, ""),
      ...unicosOrdenados(valores).map(valor => new Option(valor, valor))
    );
    select.value = "";
    select.disabled = desabilitado;
  }

  function obterMovimentoDaTela() {
    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    const info = document.getElementById(INFO_ID);
    const titulo = normalizar(document.getElementById("modalChegadaTitulo")?.textContent);

    if (!id || (!titulo.includes("FACCAO") && !titulo.includes("FACÇÃO"))) return null;

    let linha = texto(info?.querySelector("span")?.textContent);
    if (!linha) {
      linha = texto(info?.innerText || info?.textContent)
        .split(/\n+/)
        .map(texto)
        .find(item => item.includes("|") && normalizar(item).includes("ENVIADO")) || "";
    }

    const partes = linha.split("|").map(texto).filter(Boolean);
    const destino = partes[0] || "";
    const processo = partes.find((parte, indice) =>
      indice > 0 && !normalizar(parte).startsWith("ENVIADO")
    ) || "";

    return { id, destino, processo };
  }

  function processosDisponiveis(movimento) {
    let processos = [];

    try {
      if (typeof window.getNomesProcessosFaccoesAtivos === "function") {
        processos = window.getNomesProcessosFaccoesAtivos();
      }
    } catch (error) {
      console.warn("Não foi possível usar os processos dinâmicos.", error);
    }

    if (!Array.isArray(processos) || !processos.length) {
      processos = Object.keys(PROCESSOS_FACCOES);
    }

    if (movimento?.processo) processos = [...processos, movimento.processo];
    return unicosOrdenados(processos);
  }

  function faccoesLocaisDoProcesso(processo, movimento) {
    let faccoes = [];

    try {
      if (typeof window.getFaccoesGerenciadasPorProcesso === "function") {
        faccoes = window.getFaccoesGerenciadasPorProcesso(processo);
      }
    } catch (error) {
      console.warn("Não foi possível usar as facções dinâmicas.", error);
    }

    if (!Array.isArray(faccoes) || !faccoes.length) {
      const chave = Object.keys(PROCESSOS_FACCOES)
        .find(nome => normalizar(nome) === normalizar(processo));
      faccoes = chave ? PROCESSOS_FACCOES[chave] : [];
    }

    if (
      movimento?.destino &&
      normalizar(processo) === normalizar(movimento.processo)
    ) {
      faccoes = [...faccoes, movimento.destino];
    }

    return unicosOrdenados(faccoes);
  }

  function processosDaFaccao(faccao) {
    const campos = [
      faccao?.processosPermitidos,
      faccao?.processos,
      faccao?.servicosPermitidos,
      faccao?.servicos,
      faccao?.processo
    ];

    const processos = [];
    campos.forEach(campo => {
      const itens = Array.isArray(campo) ? campo : (campo ? [campo] : []);
      itens.forEach(item => {
        const nome = texto(
          typeof item === "string"
            ? item
            : item?.nome || item?.processo || item?.servicoNome || item?.label
        );
        if (nome) processos.push(nome);
      });
    });

    return unicosOrdenados(processos);
  }

  async function carregarFaccoesRemotas() {
    if (cacheFaccoesRemotas) return cacheFaccoesRemotas;

    const { db, firestore } = await contextoFirebase();
    const snap = await firestore.getDocs(firestore.collection(db, "faccoes"));
    cacheFaccoesRemotas = snap.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(faccao =>
        faccao.ativo !== false &&
        !faccao.cadastroPendente &&
        !faccao.duplicadaDe &&
        faccao.statusImportacao !== "duplicada_consolidada"
      );

    return cacheFaccoesRemotas;
  }

  async function selecionarProcesso() {
    limparErro();

    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const faccaoSelect = document.getElementById(FACCAO_ID);

    if (!processo) {
      preencherSelect(faccaoSelect, "Selecione o processo primeiro", [], true);
      return;
    }

    const locais = faccoesLocaisDoProcesso(processo, movimentoPendente);
    if (locais.length) {
      preencherSelect(faccaoSelect, "Selecione quem realizou", locais, false);
      return;
    }

    if (carregandoFaccoes) return;
    carregandoFaccoes = true;
    preencherSelect(faccaoSelect, "Carregando facções...", [], true);

    try {
      const faccoes = await carregarFaccoesRemotas();
      const nomes = faccoes
        .filter(faccao => processosDaFaccao(faccao)
          .some(nome => normalizar(nome) === normalizar(processo)))
        .map(faccao => texto(faccao.nome || faccao.nomeFaccao || faccao.razaoSocial))
        .filter(Boolean);

      if (
        movimentoPendente?.destino &&
        normalizar(processo) === normalizar(movimentoPendente.processo)
      ) {
        nomes.push(movimentoPendente.destino);
      }

      preencherSelect(
        faccaoSelect,
        nomes.length ? "Selecione quem realizou" : "Nenhuma facção vinculada",
        nomes,
        !nomes.length
      );
    } catch (error) {
      console.error("Erro ao carregar facções do processo.", error);
      preencherSelect(faccaoSelect, "Erro ao carregar facções", [], true);
      mostrarErro("Não foi possível carregar as facções deste processo.");
    } finally {
      carregandoFaccoes = false;
    }
  }

  function abrirConfirmacao(form) {
    removerInterfaceAntiga();
    instalarEstilo();
    garantirModalConfirmacao();
    limparErro();

    const movimento = obterMovimentoDaTela();
    if (!movimento) {
      form.dataset.chegada83Liberada = "1";
      form.requestSubmit();
      return;
    }

    formPendente = form;
    movimentoPendente = movimento;

    const resumo = document.getElementById(RESUMO_ID);
    if (resumo) {
      resumo.textContent = `Registrado na saída: ${movimento.processo || "não informado"} • ${movimento.destino || "não informado"}`;
    }

    preencherSelect(
      document.getElementById(PROCESSO_ID),
      "Selecione o processo",
      processosDisponiveis(movimento),
      false
    );
    preencherSelect(document.getElementById(FACCAO_ID), "Selecione o processo primeiro", [], true);

    const botao = document.getElementById(BTN_CONFIRMAR_ID);
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Confirmar operação";
    }

    document.getElementById(MODAL_CONFIRMACAO_ID)?.classList.remove("hidden");
    document.body.classList.add("cc83-aberto");
    window.setTimeout(() => document.getElementById(PROCESSO_ID)?.focus(), 0);
  }

  function fecharConfirmacao() {
    document.getElementById(MODAL_CONFIRMACAO_ID)?.classList.add("hidden");
    document.body.classList.remove("cc83-aberto");
    limparErro();
    formPendente = null;
    movimentoPendente = null;
    carregandoFaccoes = false;
  }

  async function aguardarUsuario(auth) {
    if (auth.currentUser) return auth.currentUser;

    for (let tentativa = 0; tentativa < 12; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 50));
      if (auth.currentUser) return auth.currentUser;
    }

    return null;
  }

  async function localizarIdFaccao(faccao) {
    try {
      const { db, firestore } = await contextoFirebase();
      const consulta = firestore.query(
        firestore.collection(db, "faccoes"),
        firestore.where("nome", "==", faccao),
        firestore.limit(1)
      );
      const snap = await firestore.getDocs(consulta);
      return snap.empty ? "" : snap.docs[0].id;
    } catch (error) {
      console.warn("Não foi possível localizar o ID da facção.", error);
      return "";
    }
  }

  async function salvarCorrecao(processo, faccao) {
    const movimento = movimentoPendente;
    if (!movimento) throw new Error("Movimentação não encontrada.");

    const alterouProcesso = normalizar(processo) !== normalizar(movimento.processo);
    const alterouFaccao = normalizar(faccao) !== normalizar(movimento.destino);
    if (!alterouProcesso && !alterouFaccao) return false;

    const { auth, db, firestore } = await contextoFirebase();
    const usuario = await aguardarUsuario(auth);
    if (!usuario) throw new Error("Usuário não autenticado.");

    const destinoId = alterouFaccao ? await localizarIdFaccao(faccao) : undefined;
    const dados = {
      processoAnteriorChegada: movimento.processo || "",
      destinoAnteriorChegada: movimento.destino || "",
      processo,
      destino: faccao,
      correcaoNaChegada: true,
      correcaoChegadaVersao: VERSION,
      correcaoChegadaPor: usuario.uid,
      correcaoChegadaEm: firestore.serverTimestamp(),
      atualizadoPor: usuario.uid,
      atualizadoEm: firestore.serverTimestamp()
    };

    if (alterouFaccao) {
      dados.destinoIdAnteriorChegada = "";
      dados.destinoId = destinoId;
      dados.destinoIdPendenteCorrecao = !destinoId;
    }

    await firestore.updateDoc(
      firestore.doc(db, "movimentacoesProducao", movimento.id),
      dados
    );

    movimento.processo = processo;
    movimento.destino = faccao;
    return true;
  }

  function atualizarResumoPrincipal(processo, faccao) {
    const info = document.getElementById(INFO_ID);
    const span = info?.querySelector("span");
    if (!span) return;

    const enviado = texto(span.textContent)
      .split("|")
      .map(texto)
      .find(parte => normalizar(parte).startsWith("ENVIADO")) || "";

    span.textContent = `${faccao} | ${processo}${enviado ? ` | ${enviado}` : ""}`;
  }

  async function confirmarOperacao() {
    limparErro();

    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const faccao = texto(document.getElementById(FACCAO_ID)?.value);

    if (!processo) {
      mostrarErro("Selecione o processo que realmente foi realizado.");
      document.getElementById(PROCESSO_ID)?.focus();
      return;
    }

    if (!faccao) {
      mostrarErro("Selecione quem fez / a facção responsável.");
      document.getElementById(FACCAO_ID)?.focus();
      return;
    }

    const permitidas = faccoesLocaisDoProcesso(processo, movimentoPendente);
    if (permitidas.length && !permitidas.some(nome => normalizar(nome) === normalizar(faccao))) {
      mostrarErro("A facção escolhida não pertence ao processo selecionado.");
      return;
    }

    const botao = document.getElementById(BTN_CONFIRMAR_ID);
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Concluindo...";
    }

    try {
      await salvarCorrecao(processo, faccao);
      atualizarResumoPrincipal(processo, faccao);

      const form = formPendente;
      document.getElementById(MODAL_CONFIRMACAO_ID)?.classList.add("hidden");
      document.body.classList.remove("cc83-aberto");
      formPendente = null;
      movimentoPendente = null;

      if (form) {
        form.dataset.chegada83Liberada = "1";
        form.requestSubmit();
      }
    } catch (error) {
      console.error("Erro ao confirmar processo e facção da chegada.", error);
      mostrarErro("Não foi possível salvar a conferência. A chegada não foi registrada.");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Confirmar operação";
      }
    }
  }

  function instalarEventos() {
    document.addEventListener("submit", event => {
      if (event.target?.id !== FORM_ID) return;

      const form = event.target;
      if (form.dataset.chegada83Liberada === "1") {
        delete form.dataset.chegada83Liberada;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      abrirConfirmacao(form);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !document.getElementById(MODAL_CONFIRMACAO_ID)?.classList.contains("hidden")) {
        fecharConfirmacao();
      }
    });

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest("#btnFecharModalChegada,#btnCancelarModalChegada")) {
        fecharConfirmacao();
      }
    }, true);
  }

  function iniciar() {
    removerInterfaceAntiga();
    instalarEstilo();
    garantirModalConfirmacao();
    instalarEventos();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
