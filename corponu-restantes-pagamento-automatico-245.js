(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-pagamento-automatico-245";
  const FORM_RESTANTE_ID = "formReceberRestantePagamento";
  const FORM_CHEGADA_MANUAL_ID = "formChegadaManualFaccao";
  const GUARD = "__CORPONU_RESTANTES_PAGAMENTO_AUTOMATICO_245__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let restanteSelecionadoId = "";
  let salvando = false;
  let firebasePromise = null;
  let precosPromise = null;
  let reparoSeguroExecutado = false;

  const texto = valor => String(valor ?? "").trim();

  function normalizar(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function referenciaCanonica(valor) {
    const bruto = normalizar(valor).replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
    if (/^\d+$/.test(bruto)) return String(Number(bruto));
    return bruto;
  }

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALCA",
      "ALCAS": "ALCA",
      "LATERAL": "LATERAL",
      "LATERAL E ALCA": "LATERAL E ALCA",
      "CALCINHA": "CALCINHA COMPLETA",
      "CALCINHA COMPLETA": "CALCINHA COMPLETA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM",
      "CALCINHA MONTAGEM": "CALCINHA MONTAGEM",
      "SUTIA MONTAGEM": "SUTIA MONTAGEM",
      "SUTIA COMPLETO": "SUTIA COMPLETO",
      "INTERLOCK": "INTERLOCK"
    };
    return aliases[chave] || chave;
  }

  function numero(valor, padrao = 0) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  }

  function inteiro(valor, padrao = 0) {
    return Math.max(0, Math.floor(numero(valor, padrao)));
  }

  function arred4(valor) {
    return Math.round((numero(valor) + Number.EPSILON) * 10000) / 10000;
  }

  function arred2(valor) {
    return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  }

  function moeda(valor) {
    return numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function hojeISO() {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function setorDoProcesso(processo) {
    const nome = processoCanonico(processo);
    if (nome.includes("CALCINHA")) return "calcinha";
    if (nome.includes("BOJO")) return "bojo";
    if (nome.includes("LATERAL")) return "lateral";
    if (nome === "ALCA") return "alca";
    return "sutia";
  }

  function labelSetor(setor) {
    const mapa = {
      sutia: "Sutiã",
      calcinha: "Calcinha",
      bojo: "Bojo",
      lateral: "Lateral",
      alca: "Alça"
    };
    return mapa[String(setor || "").toLowerCase()] || "Produção";
  }

  function slug(valor) {
    return normalizar(valor)
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "SEM-DADO";
  }

  function avisar(mensagem, tipo = "normal") {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      const anterior = toast.style.background;
      if (tipo === "erro") toast.style.background = "#991b1b";
      clearTimeout(window.__corponu245Toast);
      window.__corponu245Toast = setTimeout(() => {
        toast.classList.add("hidden");
        toast.style.background = anterior;
      }, 5500);
      return;
    }
    (tipo === "erro" ? console.error : console.info)(`[CorpoNu 245] ${mensagem}`);
  }

  function injetarProtecaoVisual() {
    if (document.getElementById("styleCorponuRestantesAutomatico245")) return;
    const style = document.createElement("style");
    style.id = "styleCorponuRestantesAutomatico245";
    style.textContent = `
      #btnAbrirChegadaManualFaccao,
      #modalChegadaManualFaccao { display:none!important; }
      .corponu-245-valor-manual-restante { display:none!important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  async function obterFirebase() {
    if (!firebasePromise) {
      firebasePromise = Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]).then(([appMod, authMod, fs]) => {
        if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado");
        const app = appMod.getApp();
        return {
          auth: authMod.getAuth(app),
          authMod,
          db: fs.getFirestore(app),
          fs
        };
      }).catch(error => {
        firebasePromise = null;
        throw error;
      });
    }
    return firebasePromise;
  }

  async function carregarPrecosAtivos(db, fs, forcar = false) {
    if (forcar) precosPromise = null;
    if (!precosPromise) {
      precosPromise = fs.getDocs(fs.collection(db, "precosReferencia")).then(snap =>
        snap.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .filter(item => item && item.ativo !== false && numero(item.valor, 0) > 0)
      );
    }
    return precosPromise;
  }

  function encontrarPreco(movimento, precos) {
    const idSalvo = texto(movimento?.precoReferenciaId || movimento?.servicoId);
    if (idSalvo) {
      const porId = (precos || []).find(item => item.id === idSalvo && numero(item.valor, 0) > 0);
      if (porId) return porId;
    }

    const refOriginal = texto(movimento?.referencia);
    const processoOriginal = texto(movimento?.processo || movimento?.processoMovimentacao || movimento?.servicoNome);
    const ref = referenciaCanonica(refOriginal);
    const processo = processoCanonico(processoOriginal);
    if (!ref || !processo) return null;

    const setorMov = String(movimento?.setor || setorDoProcesso(processoOriginal)).toLowerCase();
    const candidatos = (precos || [])
      .filter(item =>
        referenciaCanonica(item?.referencia) === ref &&
        processoCanonico(item?.processo || item?.servicoNome) === processo &&
        numero(item?.valor, 0) > 0
      )
      .map(item => {
        let score = 0;
        if (normalizar(item.referencia) === normalizar(refOriginal)) score += 4;
        if (normalizar(item.processo || item.servicoNome) === normalizar(processoOriginal)) score += 5;
        if (String(item.setor || "").toLowerCase() === setorMov) score += 3;
        if (item.ativo !== false) score += 1;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    return candidatos[0]?.item || null;
  }

  function restantePendente(item) {
    return item &&
      item.origemRestanteFaccao === true &&
      item.excluido !== true &&
      !item.dataChegada &&
      inteiro(item.quantidadeEnviada || item.quantidadeRestantePendente || item.falta) > 0 &&
      ["RESTANTE_PENDENTE", "PENDENTE"].includes(normalizar(item.status || item.restanteStatus || "restante_pendente"));
  }

  function documentoRestante({ movimento, restanteId, quantidade, sequencia, usuario, fs, dataGeracao }) {
    const qtd = inteiro(quantidade);
    const setor = movimento.setor || setorDoProcesso(movimento.processo);
    return {
      id: restanteId,
      origem: "restante_faccao",
      origemRestanteFaccao: true,
      origemManualPagamentos: movimento.origemManualPagamentos === true,
      tipoDestino: "faccao",
      tipoDestinoLabel: "Facção",
      movimentacaoOrigemId: movimento.movimentacaoOrigemId || movimento.id || "",
      movimentacaoRaizId: movimento.movimentacaoRaizId || movimento.movimentacaoOrigemId || movimento.id || "",
      restanteSequencia: Math.max(1, Number(sequencia) || 1),
      restantePendente: true,
      restanteStatus: "pendente",
      opId: movimento.opId || "",
      numeroOP: movimento.numeroOP || "",
      referencia: movimento.referencia || "",
      cor: movimento.cor || "",
      produtoNome: movimento.produtoNome || "",
      setor,
      setorLabel: movimento.setorLabel || labelSetor(setor),
      destino: movimento.destino || "",
      destinoId: movimento.destinoId || "",
      processo: movimento.processo || movimento.processoMovimentacao || "",
      processoMovimentacao: movimento.processo || movimento.processoMovimentacao || "",
      quantidadeEnviada: qtd,
      quantidadeRecebida: 0,
      quantidadeRestantePendente: qtd,
      falta: qtd,
      dataEnvio: movimento.dataEnvio || "",
      dataGeracaoRestante: dataGeracao || movimento.dataChegada || hojeISO(),
      dataChegada: "",
      descontoDefeito: 0,
      defeito: 0,
      status: "restante_pendente",
      observacoes: `Restante automático de ${qtd} peça(s) da OP ${movimento.numeroOP || "-"}.`,
      criadoPor: usuario.uid,
      criadoEm: fs.serverTimestamp(),
      atualizadoPor: usuario.uid,
      atualizadoEm: fs.serverTimestamp(),
      versaoRestanteFaccao: VERSION
    };
  }

  function dadosPagamentoAutomatico({ movimento, pagamentoId, quantidade, preco, usuario, fs, observacoes }) {
    const qtd = inteiro(quantidade);
    const valorUnitario = arred4(preco?.valor || 0);
    const subtotal = arred4(qtd * valorUnitario);
    const descontoDefeito = arred2(movimento.descontoDefeito ?? movimento.defeito ?? 0);
    const total = arred2(Math.max(subtotal - descontoDefeito, 0));
    const processo = preco?.processo || movimento.processo || movimento.processoMovimentacao || movimento.servicoNome || "";
    const setor = preco?.setor || movimento.setor || setorDoProcesso(processo);
    const temPreco = Boolean(preco && valorUnitario > 0);

    return {
      id: pagamentoId,
      origem: "movimentacao",
      origemRestantePagamento: true,
      origemManualPagamentos: false,
      pagamentoManualFinanceiro: false,
      pagamentoComplementarRestante: true,
      movimentacaoId: movimento.id,
      movimentacaoOrigemId: movimento.movimentacaoOrigemId || "",
      pagamentoReenvio: true,
      opId: movimento.opId || "",
      numeroOP: movimento.numeroOP || "",
      referencia: movimento.referencia || "",
      cor: movimento.cor || "",
      produtoNome: movimento.produtoNome || "",
      faccao: movimento.destino || movimento.faccao || "SEM FACÇÃO",
      precoReferenciaId: temPreco ? preco.id : "",
      processo,
      processoMovimentacao: movimento.processo || movimento.processoMovimentacao || processo,
      servicoId: temPreco ? preco.id : "",
      servicoNome: processo,
      setor,
      setorLabel: labelSetor(setor),
      dataEntrega: movimento.dataChegada || hojeISO(),
      quantidade: qtd,
      falta: inteiro(movimento.falta),
      descontoDefeito,
      subtotal: temPreco ? subtotal : 0,
      valorUnitario: temPreco ? valorUnitario : 0,
      total: temPreco ? total : 0,
      statusPagamento: temPreco ? "pendente" : "sem_valor",
      valorPendente: !temPreco,
      valorManualFinanceiroPendente: false,
      valorManualFinanceiro: false,
      valorTotalDefinidoManualmente: false,
      valorTotalManual: 0,
      formaValorPagamento: temPreco ? "preco_referencia_processo" : "preco_referencia_ausente",
      motivoValorPendente: temPreco ? "" : "preco_referencia_processo_ausente",
      avisoPagamento: temPreco ? "" : `Adicionar valor para Ref. ${movimento.referencia || "-"} + ${processo || "-"}.`,
      observacoes: observacoes || (temPreco
        ? "Gerado automaticamente pela chegada complementar de Restantes pendentes usando REF + PROCESSO normalizados."
        : "Pagamento complementar em aberto porque não foi localizado preço ativo compatível para REF + PROCESSO."),
      criadoPor: usuario.uid,
      criadoEm: fs.serverTimestamp(),
      atualizadoPor: usuario.uid,
      atualizadoEm: fs.serverTimestamp(),
      versaoGeracao: VERSION,
      versaoRegistro: VERSION
    };
  }

  function prepararModalRestante() {
    const modal = document.getElementById("modalReceberRestantePagamento");
    if (!modal || modal.classList.contains("hidden")) return;
    const valor = document.getElementById("restPagValorTotal");
    if (valor) {
      valor.value = "";
      valor.disabled = true;
      valor.closest("label")?.classList.add("corponu-245-valor-manual-restante");
    }
    const subtitulo = modal.querySelector(".modal-header p");
    if (subtitulo) subtitulo.textContent = "O pagamento será calculado automaticamente pela REF + processo da tabela de preços.";
    atualizarPreviewAutomatico();
  }

  function atualizarPreviewAutomatico() {
    const preview = document.getElementById("previewRestantePagamento");
    const input = document.getElementById("restPagQuantidadeRecebida");
    if (!preview || !input) return;
    const pendente = inteiro(input.max || input.value || 0);
    const recebida = inteiro(input.value || 0);
    const saldo = Math.max(pendente - recebida, 0);
    preview.innerHTML = `Recebidas agora: <strong>${recebida.toLocaleString("pt-BR")}</strong> peça(s).<br>${saldo > 0 ? `Novo saldo restante: <strong>${saldo.toLocaleString("pt-BR")}</strong> peça(s).` : "O restante será concluído."}<br>Pagamento: <strong>automático pela REF + processo</strong>.`;
  }

  async function salvarRecebimentoAutomatico(event) {
    const form = event.target;
    if (!form || form.id !== FORM_RESTANTE_ID) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (salvando) return;

    const restanteId = restanteSelecionadoId;
    const recebida = inteiro(document.getElementById("restPagQuantidadeRecebida")?.value);
    const dataChegada = document.getElementById("restPagDataChegada")?.value || "";
    const observacoes = document.getElementById("restPagObservacoes")?.value?.trim() || "";
    const confirmado = document.getElementById("restPagConfirmacao")?.checked;
    const pendenteTela = inteiro(document.getElementById("restPagQuantidadeRecebida")?.max || 0);

    if (!restanteId) return avisar("Não consegui identificar o restante selecionado. Reabra a janela pela lista.", "erro");
    if (!recebida || !dataChegada || !confirmado) return avisar("Preencha e confira os campos obrigatórios.", "erro");
    if (pendenteTela > 0 && recebida > pendenteTela) return avisar("A quantidade recebida é maior que o saldo pendente.", "erro");

    const botao = document.getElementById("btnSalvarRestantePagamento");
    const textoBotao = botao?.textContent || "Salvar chegada complementar";
    salvando = true;
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Calculando e salvando...";
    }

    try {
      const { auth, db, fs } = await obterFirebase();
      const usuario = auth.currentUser;
      if (!usuario) throw new Error("SEM_USUARIO");

      const restanteRef = fs.doc(db, "movimentacoesProducao", restanteId);
      const previewSnap = await fs.getDoc(restanteRef);
      if (!previewSnap.exists()) throw new Error("INEXISTENTE");
      const previewMov = { id: previewSnap.id, ...previewSnap.data() };
      const precos = await carregarPrecosAtivos(db, fs, true);

      const resultado = await fs.runTransaction(db, async transacao => {
        const pagamentoId = `${restanteId}-pagamento`.slice(0, 190);
        const pagamentoRef = fs.doc(db, "entregasPagamento", pagamentoId);
        const raizId = previewMov.movimentacaoRaizId || previewMov.movimentacaoOrigemId || "";
        const raizRef = raizId ? fs.doc(db, "movimentacoesProducao", raizId) : null;
        const leituras = [transacao.get(restanteRef), transacao.get(pagamentoRef)];
        if (raizRef) leituras.push(transacao.get(raizRef));
        const snaps = await Promise.all(leituras);
        const restSnap = snaps[0];
        const pagSnap = snaps[1];
        const raizSnap = raizRef ? snaps[2] : null;

        if (!restSnap.exists()) throw new Error("INEXISTENTE");
        const atual = { id: restSnap.id, ...restSnap.data() };
        if (!restantePendente(atual)) throw new Error("CONCLUIDO");
        if (pagSnap.exists() && pagSnap.data()?.excluido !== true) throw new Error("DUPLICADO");

        const pendente = inteiro(atual.quantidadeEnviada || atual.quantidadeRestantePendente || atual.falta);
        if (recebida > pendente) throw new Error("QUANTIDADE");
        const preco = encontrarPreco(atual, precos);
        const saldo = pendente - recebida;
        const proximaSequencia = Math.max(1, Number(atual.restanteSequencia) || 1) + 1;
        const raizAtualId = atual.movimentacaoRaizId || atual.movimentacaoOrigemId || atual.id;
        const proximoId = saldo > 0 ? `${slug(raizAtualId)}-restante-${proximaSequencia}`.slice(0, 190) : "";

        transacao.set(restanteRef, {
          dataChegada,
          quantidadeRecebida: recebida,
          falta: saldo,
          quantidadeRestantePendente: saldo,
          restantePendente: false,
          restanteStatus: saldo > 0 ? "entrega_parcial" : "concluido",
          status: saldo > 0 ? "retornou_parcial" : "retornou",
          chegadaComplementar: true,
          observacaoChegada: observacoes,
          proximoRestanteMovimentacaoId: proximoId,
          atualizadoPor: usuario.uid,
          atualizadoEm: fs.serverTimestamp(),
          versaoRestanteFaccao: VERSION
        }, { merge: true });

        if (saldo > 0) {
          transacao.set(fs.doc(db, "movimentacoesProducao", proximoId), documentoRestante({
            movimento: { ...atual, id: atual.id, movimentacaoRaizId: raizAtualId },
            restanteId: proximoId,
            quantidade: saldo,
            sequencia: proximaSequencia,
            usuario,
            fs,
            dataGeracao: dataChegada
          }), { merge: false });
        }

        if (raizRef && raizSnap?.exists()) {
          transacao.set(raizRef, {
            temRestantePendente: saldo > 0,
            quantidadeRestantePendente: saldo,
            restanteStatus: saldo > 0 ? "pendente" : "concluido",
            restanteMovimentacaoAtualId: proximoId,
            restanteAtualizadoPor: usuario.uid,
            restanteAtualizadoEm: fs.serverTimestamp(),
            versaoRestanteFaccao: VERSION
          }, { merge: true });
        }

        const movimentoPagamento = {
          ...atual,
          id: atual.id,
          dataChegada,
          quantidadeRecebida: recebida,
          falta: saldo,
          observacoes
        };
        transacao.set(pagamentoRef, dadosPagamentoAutomatico({
          movimento: movimentoPagamento,
          pagamentoId,
          quantidade: recebida,
          preco,
          usuario,
          fs,
          observacoes
        }), { merge: false });

        const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
        transacao.set(logRef, {
          acao: "chegada_complementar_restante_pagamento_automatico_245",
          entidade: "movimentacaoProducao",
          entidadeId: atual.id,
          detalhes: `OP ${atual.numeroOP || "-"} | REF ${atual.referencia || "-"} | ${atual.processo || "-"} | recebido ${recebida} | saldo ${saldo} | ${preco ? `preço ${moeda(numero(preco.valor) * recebida)}` : "sem preço compatível"}`,
          usuarioId: usuario.uid,
          usuarioEmail: usuario.email || "",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });

        return {
          saldo,
          temPreco: Boolean(preco),
          total: preco ? arred2(recebida * numero(preco.valor, 0)) : 0
        };
      });

      document.getElementById("modalReceberRestantePagamento")?.classList.add("hidden");
      restanteSelecionadoId = "";
      avisar(resultado.temPreco
        ? (resultado.saldo > 0
          ? `Chegada salva. Pagamento automático de ${moeda(resultado.total)} gerado; ainda restam ${resultado.saldo.toLocaleString("pt-BR")} peça(s).`
          : `Chegada salva e pagamento automático de ${moeda(resultado.total)} gerado.`)
        : "Chegada salva, mas não foi encontrado preço ativo compatível para a REF + processo. O pagamento ficou em Valor pendente.");

      setTimeout(() => document.getElementById("btnAtualizarRestantesPagamento")?.click(), 100);
    } catch (error) {
      console.error("[CorpoNu 245] Erro ao receber restante.", error);
      const mensagens = {
        SEM_USUARIO: "Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.",
        INEXISTENTE: "O restante não existe mais. Atualize a lista.",
        CONCLUIDO: "Esse restante já foi recebido ou concluído.",
        DUPLICADO: "Já existe pagamento para esta entrega complementar.",
        QUANTIDADE: "A quantidade informada é maior que o saldo atual."
      };
      avisar(mensagens[error?.message] || "Não foi possível salvar. Nenhuma alteração foi gravada.", "erro");
    } finally {
      salvando = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoBotao;
      }
    }
  }

  async function corrigirSomenteFalsosPendentesComPreco() {
    if (reparoSeguroExecutado) return;
    reparoSeguroExecutado = true;
    try {
      const { auth, authMod, db, fs } = await obterFirebase();
      if (!auth.currentUser) {
        reparoSeguroExecutado = false;
        const cancelar = authMod.onAuthStateChanged(auth, usuario => {
          if (!usuario) return;
          cancelar();
          setTimeout(corrigirSomenteFalsosPendentesComPreco, 900);
        });
        return;
      }

      const precos = await carregarPrecosAtivos(db, fs, true);
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("pagamentoComplementarRestante", "==", true)
      ));

      const alvos = snap.docs.filter(item => {
        const dados = item.data() || {};
        if (dados.excluido === true || dados.cancelado === true) return false;
        if (normalizar(dados.statusPagamento) === "PAGO") return false;
        if (dados.valorTotalDefinidoManualmente === true) return false;
        return dados.valorPendente === true || normalizar(dados.statusPagamento) === "SEM VALOR" || numero(dados.total, 0) <= 0;
      });

      let batch = fs.writeBatch(db);
      let noBatch = 0;
      let corrigidos = 0;

      for (const item of alvos) {
        const dados = { id: item.id, ...(item.data() || {}) };
        const preco = encontrarPreco(dados, precos);
        if (!preco) continue;
        const quantidade = inteiro(dados.quantidade || 0);
        if (!quantidade) continue;
        const valorUnitario = arred4(preco.valor);
        const subtotal = arred4(quantidade * valorUnitario);
        const descontoDefeito = arred2(dados.descontoDefeito || 0);
        const total = arred2(Math.max(subtotal - descontoDefeito, 0));
        const processo = preco.processo || dados.processo || dados.servicoNome || "";
        const setor = preco.setor || dados.setor || setorDoProcesso(processo);

        batch.set(item.ref, {
          precoReferenciaId: preco.id,
          servicoId: preco.id,
          processo,
          servicoNome: processo,
          setor,
          setorLabel: labelSetor(setor),
          valorUnitario,
          subtotal,
          total,
          statusPagamento: "pendente",
          valorPendente: false,
          valorManualFinanceiroPendente: false,
          pagamentoManualFinanceiro: false,
          origemManualPagamentos: false,
          formaValorPagamento: "preco_referencia_processo",
          motivoValorPendente: "",
          avisoPagamento: "",
          corrigidoRestante245: true,
          corrigidoRestante245Por: auth.currentUser.uid,
          corrigidoRestante245Em: fs.serverTimestamp(),
          atualizadoPor: auth.currentUser.uid,
          atualizadoEm: fs.serverTimestamp()
        }, { merge: true });

        corrigidos += 1;
        noBatch += 1;
        if (noBatch >= 300) {
          await batch.commit();
          batch = fs.writeBatch(db);
          noBatch = 0;
        }
      }

      if (noBatch > 0) await batch.commit();
      if (corrigidos > 0) {
        const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
        await fs.setDoc(logRef, {
          acao: "correcao_segura_restantes_245",
          entidade: "entregasPagamento",
          entidadeId: "restantes-245",
          detalhes: `${corrigidos} pagamento(s) de restante que tinham preço válido foram retirados de Valor pendente e recalculados. Registros sem preço compatível não foram alterados.`,
          usuarioId: auth.currentUser.uid,
          usuarioEmail: auth.currentUser.email || "",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });
        console.info(`[CorpoNu 245] ${corrigidos} falso(s) pendente(s) de Restantes corrigido(s).`);
      }
    } catch (error) {
      console.warn("[CorpoNu 245] Reparo seguro dos Restantes não executado.", error);
    }
  }

  function bloquearChegadaManual(event) {
    const alvo = event.target;
    if (event.type === "submit" && alvo?.id === FORM_CHEGADA_MANUAL_ID) {
      event.preventDefault();
      event.stopImmediatePropagation();
      avisar("A Chegada Manual de Facções foi removida. Use o fluxo normal de saída e chegada da movimentação.", "erro");
      return true;
    }
    const botao = alvo?.closest?.("#btnAbrirChegadaManualFaccao");
    if (botao) {
      event.preventDefault();
      event.stopImmediatePropagation();
      avisar("A Chegada Manual de Facções foi removida. Use o fluxo normal da movimentação.", "erro");
      return true;
    }
    return false;
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      if (bloquearChegadaManual(event)) return;
      const botaoRestante = event.target?.closest?.("[data-receber-restante-pagamento]");
      if (!botaoRestante) return;
      restanteSelecionadoId = texto(botaoRestante.dataset.receberRestantePagamento);
      setTimeout(prepararModalRestante, 0);
      setTimeout(prepararModalRestante, 80);
    }, true);

    document.addEventListener("submit", event => {
      if (bloquearChegadaManual(event)) return;
      if (event.target?.id === FORM_RESTANTE_ID) salvarRecebimentoAutomatico(event);
    }, true);

    document.addEventListener("input", event => {
      if (event.target?.id === "restPagQuantidadeRecebida") setTimeout(atualizarPreviewAutomatico, 0);
    }, true);
  }

  function iniciar() {
    injetarProtecaoVisual();
    instalarEventos();
    setTimeout(corrigirSomenteFalsosPendentesComPreco, 1800);
    console.info(`[CorpoNu] Restantes automáticos ativos: ${VERSION}`);
  }

  window.CorpoNuRestantes245 = {
    versao: VERSION,
    corrigirPendentesComPreco: corrigirSomenteFalsosPendentesComPreco
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
