(() => {
  "use strict";

  const VERSION = "2026-08-03-reenvio-sutia-componentes-106";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalMovimentacao";
  const FORM_ID = "formMovimentacaoProducao";
  const PAINEL_ID = "reenvioSutiaComponentes106";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";

  if (window.__CORPONU_REENVIO_SUTIA_COMPONENTES__ === VERSION) return;
  window.__CORPONU_REENVIO_SUTIA_COMPONENTES__ = VERSION;

  let contextoPromise = null;
  let carregamentoAtual = 0;
  let salvando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const numero = valor => {
    const resultado = Number(valor ?? 0);
    return Number.isFinite(resultado) ? resultado : 0;
  };

  const millis = valor => {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.toDate === "function") return valor.toDate().getTime();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  };

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    if (chave === "SUTIA COMPLETO") return PROCESSO_COMPLETO;
    if (chave === "LATERAL" || chave === "CORTE") return "LATERAL";
    if (["ENCAPAR BOJO", "ENCAPAR BOJOS", "BOJO"].includes(chave)) return "ENCAPAR BOJO";
    return texto(valor).toUpperCase();
  }

  function contextoReenvioCompleto() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.classList.contains("hidden")) return false;
    const titulo = normalizar(document.getElementById("modalMovimentacaoTitulo")?.textContent);
    const tipo = normalizar(document.getElementById("movimentacaoTipoDestino")?.value);
    const processo = processoCanonico(
      document.getElementById("movimentacaoProcessoSelect")?.value ||
      document.getElementById("movimentacaoProcesso")?.value ||
      ""
    );
    return titulo.includes("REENVIAR PARA FACCAO") && tipo === "FACCAO" && processo === PROCESSO_COMPLETO;
  }

  function mostrarAviso(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      toast.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__reenvioSutiaComponentesToast106);
      window.__reenvioSutiaComponentesToast106 = window.setTimeout(() => {
        toast.classList.add("hidden");
        toast.style.background = "";
      }, 5500);
      return;
    }
    window.alert(mensagem);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      const app = appMod.getApp();
      return {
        auth: authMod.getAuth(app),
        db: fs.getFirestore(app),
        fs
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function injetarEstilos() {
    if (document.getElementById("styleReenvioSutiaComponentes106")) return;
    const style = document.createElement("style");
    style.id = "styleReenvioSutiaComponentes106";
    style.textContent = `
      #${PAINEL_ID}{margin:2px 0 4px;padding:13px;border:1px solid #c4b5fd;border-radius:13px;background:#faf7ff}
      #${PAINEL_ID}.hidden{display:none!important}
      #${PAINEL_ID} .rsc106-head{margin-bottom:10px}
      #${PAINEL_ID} .rsc106-head strong{display:block;color:#5b21b6;font-size:13px}
      #${PAINEL_ID} .rsc106-head span{display:block;margin-top:3px;color:#6b7280;font-size:11px;line-height:1.4}
      #${PAINEL_ID} .rsc106-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #${PAINEL_ID} .rsc106-card{min-width:0;padding:11px;border:1px solid #ddd6fe;border-radius:11px;background:#fff}
      #${PAINEL_ID} .rsc106-card>span{display:block;color:#475569;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.035em}
      #${PAINEL_ID} .rsc106-status{display:flex;align-items:center;gap:7px;margin-top:7px}
      #${PAINEL_ID} .rsc106-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}
      #${PAINEL_ID} .rsc106-badge.sim{background:#dcfce7;color:#166534}
      #${PAINEL_ID} .rsc106-badge.nao{background:#f1f5f9;color:#475569}
      #${PAINEL_ID} .rsc106-badge.parcial{background:#fef3c7;color:#92400e}
      #${PAINEL_ID} .rsc106-origem{display:block;margin-top:6px;color:#64748b;font-size:10px;line-height:1.4}
      #${PAINEL_ID} label{display:block;margin:8px 0 0;color:#334155;font-size:11px;font-weight:900}
      #${PAINEL_ID} select{width:100%;min-height:40px;margin-top:5px;padding:8px 10px;border:1px solid #a78bfa;border-radius:9px;background:#fff;color:#0f172a;font:700 12px/1.3 inherit}
      #${PAINEL_ID} .rsc106-aviso{margin-top:10px;padding:8px 9px;border:1px solid #ddd6fe;border-radius:9px;background:#f5f3ff;color:#5b21b6;font-size:10px;font-weight:800;line-height:1.4}
      #${PAINEL_ID} .rsc106-carregando{padding:10px;color:#6d28d9;font-size:11px;font-weight:800;text-align:center}
      #${PAINEL_ID} .rsc106-erro{padding:10px;border:1px solid #fecaca;border-radius:9px;background:#fef2f2;color:#991b1b;font-size:11px;font-weight:800;line-height:1.4}
      @media(max-width:580px){#${PAINEL_ID} .rsc106-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function garantirPainel() {
    const form = document.getElementById(FORM_ID);
    const destino = document.getElementById("movimentacaoDestino");
    const ancora = destino?.closest("label");
    if (!form || !ancora) return null;

    let painel = document.getElementById(PAINEL_ID);
    if (!painel) {
      painel = document.createElement("section");
      painel.id = PAINEL_ID;
      painel.className = "hidden";
      ancora.insertAdjacentElement("afterend", painel);
    }
    return painel;
  }

  function movimentoValido(item) {
    const status = normalizar(item?.status || item?.statusMovimentacao);
    if (item?.cancelado === true || item?.excluido === true || [
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"
    ].includes(status)) return false;

    return Boolean(texto(item?.dataChegada || item?.dataRetorno)) || [
      "RETORNOU", "RECEBIDO", "RECEBIDA", "CONCLUIDO", "CONCLUIDA", "FINALIZADO", "FINALIZADA", "ENCAMINHADO", "ENCAMINHADA"
    ].includes(status) || numero(item?.quantidadeRecebida) > 0;
  }

  function quantidadeRecebida(item) {
    const recebida = numero(item?.quantidadeRecebida);
    if (recebida > 0) return recebida;
    return Math.max(0, numero(item?.quantidadeEnviada) - numero(item?.falta));
  }

  function resumoAutomatico(movimentos, processo, totalOP) {
    const validos = movimentos
      .filter(item => movimentoValido(item) && processoCanonico(item?.processo || item?.servicoNome) === processo)
      .sort((a, b) => millis(b.atualizadoEm || b.dataChegada || b.criadoEm) - millis(a.atualizadoEm || a.dataChegada || a.criadoEm));

    if (!validos.length) return null;
    const quantidade = validos.reduce((soma, item) => soma + quantidadeRecebida(item), 0);
    const ultimo = validos[0];
    return {
      informado: true,
      pronto: quantidade > 0,
      parcial: totalOP > 0 && quantidade > 0 && quantidade < totalOP,
      quantidade: totalOP > 0 ? Math.min(totalOP, quantidade) : quantidade,
      total: totalOP,
      origem: `Chegada de ${processo}`,
      responsavel: texto(ultimo?.destino || ultimo?.faccao || ultimo?.destinoNome),
      data: ultimo?.dataChegada || ultimo?.atualizadoEm || ""
    };
  }

  function primeiroBooleano(...valores) {
    return valores.find(valor => typeof valor === "boolean");
  }

  function statusSalvo(op, componente) {
    const consolidado = op?.componentesConsolidados?.[componente] || {};
    if (consolidado.informado === true && typeof consolidado.pronto === "boolean") {
      return {
        informado: true,
        pronto: consolidado.pronto,
        parcial: consolidado.status === "parcial" || consolidado.parcial === true,
        quantidade: numero(consolidado.quantidadePronta || consolidado.quantidade),
        total: numero(consolidado.quantidadeTotal || op?.quantidade || op?.quantidadeTotal),
        origem: texto(consolidado.origemLabel || consolidado.origem || "Informação registrada na OP"),
        responsavel: texto(consolidado.responsavel || consolidado.faccao || consolidado.quemFez)
      };
    }

    const revisao = op?.revisaoComponentesConfeccao || {};
    const origemReenvio = componente === "lateral"
      ? texto(op?.lateralFeitaConfeccaoOrigem || op?.lateralProntaOrigemAtual)
      : texto(op?.bojoFeitaConfeccaoOrigem || op?.bojoEncapadoConfeccaoOrigem || op?.bojoProntoOrigemAtual);
    const informadoReenvio = componente === "lateral"
      ? op?.lateralProntaReenvioInformada === true
      : op?.bojoProntoReenvioInformado === true;
    const valorReenvio = componente === "lateral"
      ? op?.lateralProntaReenvio
      : op?.bojoProntoReenvio;

    if (informadoReenvio && typeof valorReenvio === "boolean") {
      return {
        informado: true,
        pronto: valorReenvio,
        parcial: false,
        quantidade: 0,
        total: numero(op?.quantidade || op?.quantidadeTotal),
        origem: "Informado em um reenvio para facção",
        responsavel: ""
      };
    }

    if (componente === "lateral" && op?.lateralProntaCorte === true && op?.lateralProntaCorteAtiva !== false) {
      return {
        informado: true,
        pronto: true,
        parcial: numero(op?.lateralProntaCorteQuantidade) > 0 && numero(op?.quantidade) > 0 && numero(op?.lateralProntaCorteQuantidade) < numero(op?.quantidade),
        quantidade: numero(op?.lateralProntaCorteQuantidade),
        total: numero(op?.quantidade || op?.quantidadeTotal),
        origem: texto(op?.lateralProntaOrigemAtualLabel || "Chegada do processo LATERAL"),
        responsavel: texto(op?.lateralProntaCorteFaccao)
      };
    }

    const valorRevisao = componente === "lateral"
      ? primeiroBooleano(revisao.lateralFeita, op?.lateralFeitaConfeccao)
      : primeiroBooleano(revisao.bojoFeito, op?.bojoEncapadoConfeccao, op?.bojoProntoConfeccao);
    const revisaoTemRegistro = revisao.ativa === true || Boolean(origemReenvio);

    if (revisaoTemRegistro && typeof valorRevisao === "boolean") {
      const responsavel = componente === "lateral"
        ? texto(revisao.lateralFeitaPorNome || revisao.lateralResponsavel || op?.revisaoLateralFeitaPor)
        : texto(revisao.bojoFeitoPorNome || revisao.bojoResponsavel || op?.revisaoBojoFeitoPor);
      return {
        informado: true,
        pronto: valorRevisao,
        parcial: false,
        quantidade: 0,
        total: numero(op?.quantidade || op?.quantidadeTotal),
        origem: texto(revisao.origemAtualizacao || origemReenvio || "Revisão lateral e bojo"),
        responsavel
      };
    }

    return { informado: false, pronto: null, parcial: false, quantidade: 0, total: numero(op?.quantidade || op?.quantidadeTotal), origem: "", responsavel: "" };
  }

  function combinarStatus(salvo, automatico) {
    if (automatico?.pronto) return automatico;
    return salvo;
  }

  async function carregarOPeMovimentos(opId) {
    const { db, fs } = await contextoFirebase();
    const opSnap = await fs.getDoc(fs.doc(db, "ordensProducao", opId));
    if (!opSnap.exists()) throw new Error("A OP não foi encontrada.");
    const op = { id: opSnap.id, ...opSnap.data() };

    let movimentos = [];
    try {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "movimentacoesProducao"),
        fs.where("opId", "==", opId)
      ));
      movimentos = snap.docs.map(item => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.warn("Não foi possível consultar o histórico de lateral e bojo por OP.", error);
    }

    const total = numero(op?.quantidade || op?.quantidadeTotal);
    const lateral = combinarStatus(statusSalvo(op, "lateral"), resumoAutomatico(movimentos, "LATERAL", total));
    const bojo = combinarStatus(statusSalvo(op, "bojo"), resumoAutomatico(movimentos, "ENCAPAR BOJO", total));
    return { op, lateral, bojo };
  }

  function textoOrigem(status) {
    const partes = [];
    if (status?.origem) partes.push(status.origem);
    if (status?.responsavel) partes.push(`Facção/responsável: ${status.responsavel}`);
    if (status?.parcial && status.quantidade > 0) {
      partes.push(`${status.quantidade.toLocaleString("pt-BR")}${status.total > 0 ? ` de ${status.total.toLocaleString("pt-BR")}` : ""} peças`);
    }
    return partes.join(" • ") || "Informação registrada anteriormente na OP.";
  }

  function htmlComponente(nome, chave, status) {
    if (status.informado) {
      const classe = status.parcial ? "parcial" : (status.pronto ? "sim" : "nao");
      const label = status.parcial ? "Parcial" : (status.pronto ? "Pronta" : "Não pronta");
      return `
        <article class="rsc106-card" data-componente="${chave}" data-informado="1" data-pronto="${status.pronto ? "1" : "0"}">
          <span>${escapar(nome)}</span>
          <div class="rsc106-status"><strong>${escapar(nome)}</strong><b class="rsc106-badge ${classe}">${label}</b></div>
          <small class="rsc106-origem">${escapar(textoOrigem(status))}</small>
        </article>`;
    }

    return `
      <article class="rsc106-card" data-componente="${chave}" data-informado="0">
        <span>${escapar(nome)}</span>
        <div class="rsc106-status"><strong>Sem informação registrada</strong></div>
        <label>${escapar(nome)} já está ${chave === "bojo" ? "pronto" : "pronta"}?
          <select id="reenvioSutia${chave === "bojo" ? "Bojo" : "Lateral"}106" data-resposta-componente="${chave}">
            <option value="">Selecione</option>
            <option value="sim">Sim, já está ${chave === "bojo" ? "pronto" : "pronta"}</option>
            <option value="nao">Não, ainda não está ${chave === "bojo" ? "pronto" : "pronta"}</option>
          </select>
        </label>
        <small class="rsc106-origem">A resposta ficará registrada na OP antes do reenvio.</small>
      </article>`;
  }

  function renderizarPainel(painel, dados) {
    painel.dataset.opId = dados.op.id;
    painel.dataset.estado = "pronto";
    painel.dataset.componentesSalvos = "0";
    painel.classList.remove("hidden");
    painel.innerHTML = `
      <div class="rsc106-head">
        <strong>Conferência de lateral e bojo</strong>
        <span>O Sutiã Completo precisa levar estas informações para o cálculo correto quando retornar.</span>
      </div>
      <div class="rsc106-grid">
        ${htmlComponente("Lateral", "lateral", dados.lateral)}
        ${htmlComponente("Bojo", "bojo", dados.bojo)}
      </div>
      ${(!dados.lateral.informado || !dados.bojo.informado)
        ? '<div class="rsc106-aviso">Responda somente o que ainda não existe na OP. Informações já registradas não serão substituídas.</div>'
        : '<div class="rsc106-aviso">Lateral e bojo já possuem informação registrada. Nenhuma resposta adicional é necessária.</div>'}`;
  }

  function ocultarPainel() {
    carregamentoAtual += 1;
    const painel = garantirPainel();
    if (!painel) return;
    painel.classList.add("hidden");
    painel.dataset.estado = "oculto";
    painel.dataset.opId = "";
    painel.dataset.componentesSalvos = "0";
    painel.innerHTML = "";
  }

  async function atualizarPainel() {
    const painel = garantirPainel();
    if (!painel) return;
    if (!contextoReenvioCompleto()) {
      ocultarPainel();
      return;
    }

    const opId = texto(document.getElementById("movimentacaoOrdemId")?.value);
    if (!opId) {
      ocultarPainel();
      return;
    }

    const token = ++carregamentoAtual;
    painel.classList.remove("hidden");
    painel.dataset.estado = "carregando";
    painel.dataset.opId = opId;
    painel.innerHTML = '<div class="rsc106-carregando">Consultando lateral e bojo desta OP...</div>';

    try {
      const dados = await carregarOPeMovimentos(opId);
      if (token !== carregamentoAtual || !contextoReenvioCompleto()) return;
      renderizarPainel(painel, dados);
    } catch (error) {
      console.error("Não foi possível consultar lateral e bojo no reenvio.", error);
      if (token !== carregamentoAtual) return;
      painel.dataset.estado = "erro";
      painel.innerHTML = `<div class="rsc106-erro">Não foi possível consultar lateral e bojo agora. Feche este card, confira a conexão e tente novamente.</div>`;
    }
  }

  function respostasPendentes(painel) {
    const mudancas = {};
    const faltando = [];
    painel.querySelectorAll('[data-componente][data-informado="0"]').forEach(card => {
      const componente = card.dataset.componente;
      const select = card.querySelector("[data-resposta-componente]");
      const valor = texto(select?.value);
      if (!valor) {
        faltando.push(componente === "bojo" ? "bojo" : "lateral");
      } else {
        mudancas[componente] = valor === "sim";
      }
    });
    return { mudancas, faltando };
  }

  async function salvarRespostas(opId, mudancas) {
    const chaves = Object.keys(mudancas);
    if (!chaves.length) return;

    const { auth, db, fs } = await contextoFirebase();
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");

    const opRef = fs.doc(db, "ordensProducao", opId);
    const opSnap = await fs.getDoc(opRef);
    if (!opSnap.exists()) throw new Error("A OP não foi encontrada para registrar os componentes.");

    const patch = {
      "revisaoComponentesConfeccao.ativa": true,
      "revisaoComponentesConfeccao.origemAtualizacao": "reenvio_faccao",
      "revisaoComponentesConfeccao.atualizadoPor": usuario.uid,
      "revisaoComponentesConfeccao.atualizadoEm": fs.serverTimestamp(),
      componentesReenvioVersao: VERSION,
      componentesReenvioAtualizadoPor: usuario.uid,
      componentesReenvioAtualizadoEm: fs.serverTimestamp(),
      atualizadoPor: usuario.uid,
      atualizadoEm: fs.serverTimestamp()
    };

    if (Object.prototype.hasOwnProperty.call(mudancas, "lateral")) {
      const pronta = mudancas.lateral;
      patch["revisaoComponentesConfeccao.lateralFeita"] = pronta;
      patch["revisaoComponentesConfeccao.lateralInformada"] = true;
      patch["componentesConsolidados.lateral.informado"] = true;
      patch["componentesConsolidados.lateral.pronto"] = pronta;
      patch["componentesConsolidados.lateral.status"] = pronta ? "completo" : "nao_pronto";
      patch["componentesConsolidados.lateral.origem"] = "reenvio_faccao";
      patch["componentesConsolidados.lateral.origemLabel"] = "Informado no reenvio para facção";
      patch["componentesConsolidados.lateral.atualizadoPor"] = usuario.uid;
      patch["componentesConsolidados.lateral.atualizadoEm"] = fs.serverTimestamp();
      patch.lateralFeitaConfeccao = pronta;
      patch.lateralFeitaConfeccaoOrigem = "reenvio_faccao";
      patch.lateralProntaReenvioInformada = true;
      patch.lateralProntaReenvio = pronta;
    }

    if (Object.prototype.hasOwnProperty.call(mudancas, "bojo")) {
      const pronto = mudancas.bojo;
      patch["revisaoComponentesConfeccao.bojoFeito"] = pronto;
      patch["revisaoComponentesConfeccao.bojoInformado"] = true;
      patch["componentesConsolidados.bojo.informado"] = true;
      patch["componentesConsolidados.bojo.pronto"] = pronto;
      patch["componentesConsolidados.bojo.status"] = pronto ? "completo" : "nao_pronto";
      patch["componentesConsolidados.bojo.origem"] = "reenvio_faccao";
      patch["componentesConsolidados.bojo.origemLabel"] = "Informado no reenvio para facção";
      patch["componentesConsolidados.bojo.atualizadoPor"] = usuario.uid;
      patch["componentesConsolidados.bojo.atualizadoEm"] = fs.serverTimestamp();
      patch.bojoEncapadoConfeccao = pronto;
      patch.bojoProntoConfeccao = pronto;
      patch.bojoEncapadoConfeccaoOrigem = "reenvio_faccao";
      patch.bojoProntoReenvioInformado = true;
      patch.bojoProntoReenvio = pronto;
    }

    await fs.updateDoc(opRef, patch);

    try {
      const detalhes = chaves.map(chave => `${chave === "bojo" ? "Bojo" : "Lateral"}: ${mudancas[chave] ? "pronto" : "não pronto"}`).join(" | ");
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: "componentes_informados_reenvio_faccao",
        tipoAlvo: "ordemProducao",
        alvoId: opId,
        detalhes,
        usuarioUid: usuario.uid,
        usuarioNome: usuario.displayName || "",
        usuarioEmail: usuario.email || "",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (errorLog) {
      console.warn("Componentes salvos, mas o log complementar não foi criado.", errorLog);
    }
  }

  async function interceptarEnvio(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    if (form.dataset.reenvioComponentesBypass106 === "1") {
      delete form.dataset.reenvioComponentesBypass106;
      return;
    }
    if (!contextoReenvioCompleto()) return;

    const painel = document.getElementById(PAINEL_ID);
    const opId = texto(document.getElementById("movimentacaoOrdemId")?.value);
    if (!painel || painel.dataset.opId !== opId || painel.dataset.estado === "carregando") {
      event.preventDefault();
      event.stopImmediatePropagation();
      mostrarAviso("Aguarde a consulta de lateral e bojo terminar antes de confirmar o reenvio.", true);
      return;
    }
    if (painel.dataset.estado === "erro") {
      event.preventDefault();
      event.stopImmediatePropagation();
      mostrarAviso("Não foi possível consultar lateral e bojo. Feche o card e tente novamente.", true);
      return;
    }
    if (painel.dataset.componentesSalvos === "1") return;

    const { mudancas, faltando } = respostasPendentes(painel);
    if (faltando.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      mostrarAviso(`Informe a situação de ${faltando.join(" e ")} antes de reenviar para Sutiã Completo.`, true);
      painel.querySelector('[data-resposta-componente]')?.focus();
      return;
    }
    if (!Object.keys(mudancas).length) return;
    if (salvando) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    salvando = true;
    const submitter = event.submitter instanceof HTMLButtonElement ? event.submitter : null;
    const textoOriginal = submitter?.textContent || "Confirmar envio";
    if (submitter) {
      submitter.disabled = true;
      submitter.textContent = "Salvando componentes...";
    }

    try {
      await salvarRespostas(opId, mudancas);
      painel.dataset.componentesSalvos = "1";
      painel.querySelectorAll("select").forEach(select => { select.disabled = true; });
      form.dataset.reenvioComponentesBypass106 = "1";
      if (submitter && submitter.form === form) form.requestSubmit(submitter);
      else form.requestSubmit();
    } catch (error) {
      console.error("Não foi possível salvar lateral e bojo antes do reenvio.", error);
      mostrarAviso(error?.code === "permission-denied"
        ? "Seu usuário não possui permissão para registrar lateral e bojo nesta OP."
        : (error?.message || "Não foi possível registrar lateral e bojo."), true);
    } finally {
      salvando = false;
      if (submitter && document.contains(submitter)) {
        submitter.disabled = false;
        submitter.textContent = textoOriginal;
      }
    }
  }

  function instalarEventos() {
    const processoSelect = document.getElementById("movimentacaoProcessoSelect");
    const processoInput = document.getElementById("movimentacaoProcesso");
    if (processoSelect && processoSelect.dataset.reenvioSutia106 !== "1") {
      processoSelect.dataset.reenvioSutia106 = "1";
      processoSelect.addEventListener("change", () => window.setTimeout(atualizarPainel, 0));
    }
    if (processoInput && processoInput.dataset.reenvioSutia106 !== "1") {
      processoInput.dataset.reenvioSutia106 = "1";
      processoInput.addEventListener("input", () => window.setTimeout(atualizarPainel, 60));
    }
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest("button") : null;
    if (!alvo) return;
    const onclick = texto(alvo.getAttribute("onclick"));
    const rotulo = normalizar(alvo.textContent);
    if (onclick.includes("reenviarMovimentacaoParaFaccao") || rotulo === "REENVIAR" || rotulo.includes("REENVIAR PARA FACCAO")) {
      [0, 80, 220, 500].forEach(atraso => window.setTimeout(atualizarPainel, atraso));
    }
    if (alvo.closest("#btnFecharModalMovimentacao, #modalMovimentacao .modal-close")) ocultarPainel();
  }, true);

  window.addEventListener("submit", interceptarEnvio, true);

  function iniciar() {
    injetarEstilos();
    garantirPainel();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      garantirPainel();
      instalarEventos();
      if (tentativas >= 30 || document.getElementById("movimentacaoProcessoSelect")) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
