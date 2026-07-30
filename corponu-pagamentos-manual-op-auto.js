(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamento-manual-op-automatica-33";
  const FB = "10.12.5";

  if (window.__CORPONU_PAGAMENTO_MANUAL_OP_AUTO__ === VERSION) return;
  window.__CORPONU_PAGAMENTO_MANUAL_OP_AUTO__ = VERSION;

  let firebasePromise = null;
  let timerBusca = 0;
  let sequenciaBusca = 0;
  let ultimaOPConfirmada = "";
  let configurado = false;
  let cliqueOriginalProgramatico = false;

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

  const possui = (objeto, campo) => Boolean(objeto) && Object.prototype.hasOwnProperty.call(objeto, campo);

  function injetarEstilos() {
    if (document.getElementById("stylePagamentoManualOPAutomatica")) return;
    const style = document.createElement("style");
    style.id = "stylePagamentoManualOPAutomatica";
    style.textContent = `
      #modalPagamentoManualFinanceiro .modal-card {
        width:min(880px, calc(100vw - 24px));
        max-height:94vh;
        border-radius:20px;
      }
      #modalPagamentoManualFinanceiro .modal-header {
        position:sticky;
        top:0;
        z-index:5;
        padding:18px 20px 14px;
        border-bottom:1px solid #e2e8f0;
        background:#fff;
      }
      #modalPagamentoManualFinanceiro #formPagamentoManualFinanceiro {
        gap:13px;
        padding:16px 20px 20px;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-intro {
        padding:10px 12px;
        border-radius:11px;
        font-size:13px;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-op {
        position:relative;
        padding:14px;
        border:1px solid #c4b5fd;
        border-radius:15px;
        background:linear-gradient(180deg,#faf5ff 0%,#fff 100%);
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-op label {
        margin:0;
        color:#4c1d95;
        font-weight:900;
      }
      #modalPagamentoManualFinanceiro #pagManualNumeroOP {
        min-height:48px;
        border-width:2px;
        border-color:#8b5cf6;
        font-size:16px;
        font-weight:900;
        letter-spacing:.02em;
      }
      #modalPagamentoManualFinanceiro #btnBuscarOPPagamentoManual {
        min-height:48px;
        white-space:nowrap;
      }
      #modalPagamentoManualFinanceiro .pag-manual-busca-status {
        grid-column:1/-1;
        display:flex;
        align-items:center;
        gap:8px;
        min-height:20px;
        color:#64748b;
        font-size:12px;
        font-weight:800;
      }
      #modalPagamentoManualFinanceiro .pag-manual-busca-status.buscando { color:#5b21b6; }
      #modalPagamentoManualFinanceiro .pag-manual-busca-status.sucesso { color:#166534; }
      #modalPagamentoManualFinanceiro .pag-manual-busca-status.erro { color:#b91c1c; }
      #modalPagamentoManualFinanceiro .pag-manual-busca-ponto {
        width:8px;
        height:8px;
        flex:0 0 auto;
        border-radius:999px;
        background:currentColor;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-resumo {
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:8px;
        padding:11px;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-resumo-item {
        min-width:0;
        padding:9px;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-resumo-item strong {
        overflow-wrap:anywhere;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-op {
        padding:12px;
        border:1px solid #d8b4fe;
        border-radius:14px;
        background:#fdfaff;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-op.hidden { display:none !important; }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:10px;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-head strong {
        display:block;
        color:#4c1d95;
        font-size:14px;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-head span {
        display:block;
        margin-top:3px;
        color:#64748b;
        font-size:11px;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card {
        display:grid;
        grid-template-columns:auto 1fr;
        align-items:center;
        gap:10px;
        padding:11px;
        border:1px solid #e2e8f0;
        border-radius:11px;
        background:#fff;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componente-icone {
        display:grid;
        place-items:center;
        width:36px;
        height:36px;
        border-radius:10px;
        font-size:18px;
        font-weight:900;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card.sim .pag-manual-componente-icone { background:#dcfce7; color:#166534; }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card.nao .pag-manual-componente-icone { background:#fee2e2; color:#991b1b; }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card.indefinido .pag-manual-componente-icone { background:#f1f5f9; color:#64748b; }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card small {
        display:block;
        color:#64748b;
        font-size:10px;
        font-weight:900;
        text-transform:uppercase;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card strong {
        display:block;
        margin-top:2px;
        color:#0f172a;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componente-card span {
        display:block;
        margin-top:3px;
        color:#64748b;
        font-size:11px;
        line-height:1.35;
      }
      #modalPagamentoManualFinanceiro .pag-manual-componentes-aviso {
        grid-column:1/-1;
        padding:8px 10px;
        border-radius:9px;
        background:#ede9fe;
        color:#5b21b6;
        font-size:11px;
        font-weight:800;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-componentes {
        position:relative;
        padding-top:38px;
      }
      #modalPagamentoManualFinanceiro .pag-manual-campos-componentes-titulo {
        position:absolute;
        top:10px;
        left:12px;
        right:12px;
        color:#5b21b6;
        font-size:11px;
        font-weight:900;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-grid {
        gap:10px 12px;
      }
      #modalPagamentoManualFinanceiro .pagamento-manual-preview {
        padding:10px 12px;
        font-size:12px;
      }
      #modalPagamentoManualFinanceiro #btnSalvarPagamentoManual:disabled {
        opacity:.5;
        cursor:not-allowed;
      }
      @media (max-width:760px) {
        #modalPagamentoManualFinanceiro .modal-header { padding:15px 14px 12px; }
        #modalPagamentoManualFinanceiro #formPagamentoManualFinanceiro { padding:13px 14px 16px; }
        #modalPagamentoManualFinanceiro .pagamento-manual-resumo { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #modalPagamentoManualFinanceiro .pag-manual-componentes-grid { grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado");
      const app = appMod.getApp();
      return { db: fs.getFirestore(app), fs };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function aguardarFirebase() {
    let ultimoErro;
    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      try {
        return await firebase();
      } catch (error) {
        ultimoErro = error;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    throw ultimoErro || new Error("Firebase indisponível");
  }

  function definirStatus(mensagem, tipo = "normal") {
    const elemento = document.getElementById("pagManualBuscaAutomaticaStatus");
    if (!elemento) return;
    elemento.className = `pag-manual-busca-status ${tipo === "normal" ? "" : tipo}`.trim();
    elemento.innerHTML = `<span class="pag-manual-busca-ponto"></span><span>${escapar(mensagem)}</span>`;
  }

  function definirSalvarLiberado(liberado) {
    const botao = document.getElementById("btnSalvarPagamentoManual");
    if (!botao || botao.textContent === "Salvando...") return;
    botao.disabled = !liberado;
  }

  function limparResultadoAnterior() {
    ultimaOPConfirmada = "";
    definirSalvarLiberado(false);
    const resumo = document.getElementById("resumoOPPagamentoManual");
    if (resumo) {
      resumo.innerHTML = "";
      resumo.classList.add("hidden");
    }
    const componentes = document.getElementById("pagManualComponentesOP");
    if (componentes) {
      componentes.innerHTML = "";
      componentes.classList.add("hidden");
    }
    const lateral = document.getElementById("pagManualLateral");
    const bojo = document.getElementById("pagManualBojo");
    if (lateral) lateral.value = "nao_informado";
    if (bojo) bojo.value = "nao_informado";
  }

  async function procurarOP(numeroOP) {
    const texto = String(numeroOP || "").trim();
    if (!texto) return null;
    const { db, fs } = await aguardarFirebase();

    if (!texto.includes("/")) {
      try {
        const direto = await fs.getDoc(fs.doc(db, "ordensProducao", texto));
        if (direto.exists()) return { id: direto.id, ...direto.data() };
      } catch (error) {
        console.warn("Busca direta da OP não disponível.", error);
      }
    }

    const consultas = [
      ["numeroOP", texto],
      ["numeroOPExterno", texto],
      ["op", texto]
    ];
    const numerico = Number(texto);
    if (Number.isFinite(numerico)) consultas.splice(1, 0, ["numeroOP", numerico]);

    for (const [campo, valor] of consultas) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "ordensProducao"),
          fs.where(campo, "==", valor),
          fs.limit(1)
        ));
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      } catch (error) {
        console.warn(`Consulta da OP pelo campo ${campo} não disponível.`, error);
      }
    }
    return null;
  }

  function dadosComponentes(op) {
    const revisao = op?.revisaoComponentesConfeccao || {};
    const revisaoAtiva = revisao.ativa === true;
    const lateralInterna = revisao.lateralFeita === true || op?.lateralFeitaConfeccao === true;
    const bojoInterno = revisao.bojoFeito === true || op?.bojoEncapadoConfeccao === true || op?.bojoProntoConfeccao === true;
    const lateralCorte = op?.lateralProntaCorte === true && op?.lateralProntaCorteAtiva !== false;

    const lateralExplicitamenteInformada = lateralCorte || lateralInterna || (
      revisaoAtiva && (possui(revisao, "lateralFeita") || possui(op, "lateralFeitaConfeccao"))
    );
    const bojoExplicitamenteInformado = bojoInterno || (
      revisaoAtiva && (possui(revisao, "bojoFeito") || possui(op, "bojoEncapadoConfeccao") || possui(op, "bojoProntoConfeccao"))
    );

    const origensLateral = [];
    if (lateralInterna) origensLateral.push("Confecção interna");
    if (lateralCorte) {
      const detalhes = [op.lateralProntaCorteFaccao, op.lateralProntaCorteProcesso].filter(Boolean).join(" • ");
      origensLateral.push(detalhes ? `Facção de Corte: ${detalhes}` : "Facção de Corte");
    }

    return {
      lateral: lateralInterna || lateralCorte ? "sim" : (lateralExplicitamenteInformada ? "nao" : "nao_informado"),
      bojo: bojoInterno ? "sim" : (bojoExplicitamenteInformado ? "nao" : "nao_informado"),
      lateralOrigem: origensLateral.join(" + ") || "Nenhuma informação registrada na OP",
      bojoOrigem: bojoInterno ? "Revisão interna da confecção" : "Nenhuma informação registrada na OP"
    };
  }

  function textoStatus(status) {
    if (status === "sim") return { classe: "sim", icone: "✓", titulo: "Pronta" };
    if (status === "nao") return { classe: "nao", icone: "×", titulo: "Não pronta" };
    return { classe: "indefinido", icone: "?", titulo: "Não informada" };
  }

  function preencherComponentes(op) {
    const dados = dadosComponentes(op);
    const lateralSelect = document.getElementById("pagManualLateral");
    const bojoSelect = document.getElementById("pagManualBojo");
    if (lateralSelect) lateralSelect.value = dados.lateral;
    if (bojoSelect) bojoSelect.value = dados.bojo;

    const lateral = textoStatus(dados.lateral);
    const bojo = textoStatus(dados.bojo);
    const painel = document.getElementById("pagManualComponentesOP");
    if (!painel) return;

    painel.innerHTML = `
      <div class="pag-manual-componentes-head">
        <div>
          <strong>Componentes já registrados nesta OP</strong>
          <span>Essas informações foram puxadas automaticamente e serão usadas no lançamento de Sutiã Montagem ou Sutiã Completo.</span>
        </div>
      </div>
      <div class="pag-manual-componentes-grid">
        <div class="pag-manual-componente-card ${lateral.classe}">
          <div class="pag-manual-componente-icone">${lateral.icone}</div>
          <div><small>Lateral</small><strong>${lateral.titulo}</strong><span>${escapar(dados.lateralOrigem)}</span></div>
        </div>
        <div class="pag-manual-componente-card ${bojo.classe}">
          <div class="pag-manual-componente-icone">${bojo.icone}</div>
          <div><small>Bojo</small><strong>${bojo.titulo}</strong><span>${escapar(dados.bojoOrigem)}</span></div>
        </div>
        <div class="pag-manual-componentes-aviso">Ao escolher SUTIÃ MONTAGEM ou SUTIÃ COMPLETO, os campos de lateral e bojo já aparecerão preenchidos. O usuário ainda poderá conferir antes de salvar.</div>
      </div>`;
    painel.classList.remove("hidden");
  }

  async function aguardarBuscaOriginal(numeroEsperado, limiteMs = 6000) {
    const inicio = Date.now();
    while (Date.now() - inicio < limiteMs) {
      const resumo = document.getElementById("resumoOPPagamentoManual");
      const entrada = document.getElementById("pagManualNumeroOP");
      if (resumo && !resumo.classList.contains("hidden") && resumo.textContent.trim() && entrada?.value) {
        const atual = normalizar(entrada.value);
        if (atual === normalizar(numeroEsperado) || resumo.textContent.includes(String(numeroEsperado))) return true;
      }
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return false;
  }

  async function executarBusca(numeroOP, { acionarBuscaOriginal = true } = {}) {
    const texto = String(numeroOP || "").trim();
    if (!texto) return;
    const minhaSequencia = ++sequenciaBusca;
    definirStatus(`Buscando a OP ${texto} automaticamente...`, "buscando");
    definirSalvarLiberado(false);

    try {
      const op = await procurarOP(texto);
      if (minhaSequencia !== sequenciaBusca) return;
      if (!op) {
        ultimaOPConfirmada = "";
        definirStatus("OP não encontrada. Confira o número informado.", "erro");
        return;
      }

      const numeroExibicao = String(op.numeroOP || op.numeroOPExterno || op.op || texto).trim();
      const entrada = document.getElementById("pagManualNumeroOP");
      if (entrada) entrada.value = numeroExibicao;

      if (acionarBuscaOriginal) {
        const botaoOriginal = document.getElementById("btnBuscarOPPagamentoManual");
        if (botaoOriginal && !botaoOriginal.disabled) {
          cliqueOriginalProgramatico = true;
          try { botaoOriginal.click(); } finally { cliqueOriginalProgramatico = false; }
        }
      }

      const originalConcluiu = await aguardarBuscaOriginal(numeroExibicao);
      if (minhaSequencia !== sequenciaBusca) return;
      if (!originalConcluiu) {
        definirStatus("A OP foi localizada, mas o formulário ainda não terminou de carregar. Use Buscar agora.", "erro");
        return;
      }

      ultimaOPConfirmada = normalizar(numeroExibicao);
      preencherComponentes(op);
      definirSalvarLiberado(true);
      definirStatus(`OP ${numeroExibicao} localizada e preenchida automaticamente.`, "sucesso");
    } catch (error) {
      console.error("Erro na busca automática do lançamento manual.", error);
      if (minhaSequencia === sequenciaBusca) {
        definirStatus("Não foi possível buscar automaticamente. Use o botão Buscar agora.", "erro");
      }
    }
  }

  function prepararEstruturaModal() {
    const modal = document.getElementById("modalPagamentoManualFinanceiro");
    const blocoBusca = modal?.querySelector(".pagamento-manual-op");
    const resumo = document.getElementById("resumoOPPagamentoManual");
    const input = document.getElementById("pagManualNumeroOP");
    const botaoBusca = document.getElementById("btnBuscarOPPagamentoManual");
    const componentesCampos = document.getElementById("componentesSutiaPagamentoManual");
    if (!modal || !blocoBusca || !resumo || !input || !botaoBusca) return false;

    injetarEstilos();
    input.placeholder = "Digite o número da OP — a busca será automática";
    botaoBusca.textContent = "Buscar agora";

    if (!document.getElementById("pagManualBuscaAutomaticaStatus")) {
      const status = document.createElement("div");
      status.id = "pagManualBuscaAutomaticaStatus";
      status.className = "pag-manual-busca-status";
      status.innerHTML = '<span class="pag-manual-busca-ponto"></span><span>Digite a OP e aguarde: a busca começa automaticamente.</span>';
      blocoBusca.appendChild(status);
    }

    if (!document.getElementById("pagManualComponentesOP")) {
      const painel = document.createElement("section");
      painel.id = "pagManualComponentesOP";
      painel.className = "pag-manual-componentes-op hidden";
      resumo.insertAdjacentElement("afterend", painel);
    }

    if (componentesCampos && !componentesCampos.querySelector(".pag-manual-campos-componentes-titulo")) {
      const titulo = document.createElement("div");
      titulo.className = "pag-manual-campos-componentes-titulo";
      titulo.textContent = "Informações puxadas da OP — confira antes de salvar";
      componentesCampos.prepend(titulo);
    }

    if (!input.dataset.buscaAutomaticaConfigurada) {
      input.dataset.buscaAutomaticaConfigurada = "1";
      input.addEventListener("input", () => {
        window.clearTimeout(timerBusca);
        sequenciaBusca += 1;
        limparResultadoAnterior();
        const valor = input.value.trim();
        if (!valor) {
          definirStatus("Digite a OP e aguarde: a busca começa automaticamente.");
          return;
        }
        if (valor.length < 3) {
          definirStatus("Continue digitando o número da OP.");
          return;
        }
        definirStatus("Aguardando você terminar de digitar...", "buscando");
        timerBusca = window.setTimeout(() => executarBusca(valor, { acionarBuscaOriginal: true }), 650);
      });
    }

    if (!botaoBusca.dataset.buscaAprimoradaConfigurada) {
      botaoBusca.dataset.buscaAprimoradaConfigurada = "1";
      botaoBusca.addEventListener("click", () => {
        if (cliqueOriginalProgramatico) return;
        window.clearTimeout(timerBusca);
        const valor = input.value.trim();
        if (!valor) return;
        setTimeout(() => executarBusca(valor, { acionarBuscaOriginal: false }), 0);
      });
    }

    if (!document.getElementById("formPagamentoManualFinanceiro")?.dataset.validacaoOpAutomatica) {
      const form = document.getElementById("formPagamentoManualFinanceiro");
      if (form) {
        form.dataset.validacaoOpAutomatica = "1";
        form.addEventListener("submit", event => {
          const atual = normalizar(input.value);
          if (!ultimaOPConfirmada || atual !== ultimaOPConfirmada) {
            event.preventDefault();
            event.stopImmediatePropagation();
            definirStatus("Aguarde a busca automática confirmar esta OP antes de salvar.", "erro");
            definirSalvarLiberado(false);
          }
        }, true);
      }
    }

    configurado = true;
    return true;
  }

  function prepararNovaAbertura() {
    if (!prepararEstruturaModal()) return;
    window.clearTimeout(timerBusca);
    sequenciaBusca += 1;
    ultimaOPConfirmada = "";
    definirSalvarLiberado(false);
    definirStatus("Digite a OP e aguarde: a busca começa automaticamente.");
    const painel = document.getElementById("pagManualComponentesOP");
    if (painel) {
      painel.innerHTML = "";
      painel.classList.add("hidden");
    }
  }

  function iniciarComTentativas() {
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      if (prepararEstruturaModal() || tentativas >= 40) return;
      setTimeout(tentar, 250);
    };
    tentar();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest("#btnPagamentoManualFinanceiro") : null;
    if (!alvo) return;
    setTimeout(prepararNovaAbertura, 0);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarComTentativas, { once: true });
  } else {
    iniciarComTentativas();
  }
})();