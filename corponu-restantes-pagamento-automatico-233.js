(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-pagamento-automatico-233";
  const FORM_RESTANTE_ID = "formReceberRestantePagamento";
  const FORM_CHEGADA_MANUAL_ID = "formChegadaManualFaccao";

  if (window.__CORPONU_RESTANTES_PAGAMENTO_AUTOMATICO_233__ === VERSION) return;
  window.__CORPONU_RESTANTES_PAGAMENTO_AUTOMATICO_233__ = VERSION;

  let restanteSelecionadoId = "";
  let salvando = false;
  let firebasePromise = null;
  let precosPromise = null;
  let reparoHistoricoIniciado = false;

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function numero(valor, padrao = 0) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const texto = String(valor ?? "").trim();
    if (!texto) return padrao;
    const convertido = texto.includes(",")
      ? Number(texto.replace(/\./g, "").replace(",", "."))
      : Number(texto);
    return Number.isFinite(convertido) ? convertido : padrao;
  }

  function inteiro(valor, padrao = 0) {
    return Math.max(0, Math.floor(numero(valor, padrao)));
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function hojeISO() {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function setorDoProcesso(processo) {
    const nome = normalizar(processo);
    if (nome.includes("CALCINHA")) return "calcinha";
    if (nome.includes("BOJO")) return "bojo";
    if (nome.includes("LATERAL")) return "lateral";
    if (nome.includes("ALCA")) return "alca";
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
      const fundoAnterior = toast.style.background;
      if (tipo === "erro") toast.style.background = "#991b1b";
      clearTimeout(window.__corponu233Toast);
      window.__corponu233Toast = setTimeout(() => {
        toast.classList.add("hidden");
        toast.style.background = fundoAnterior;
      }, 5500);
      return;
    }
    if (tipo === "erro") console.error(`[CorpoNu 233] ${mensagem}`);
    else console.info(`[CorpoNu 233] ${mensagem}`);
  }

  function injetarProtecaoVisual() {
    if (document.getElementById("styleCorponuRestantesAutomatico233")) return;
    const style = document.createElement("style");
    style.id = "styleCorponuRestantesAutomatico233";
    style.textContent = `
      #btnAbrirChegadaManualFaccao,
      #modalChegadaManualFaccao {
        display: none !important;
      }
      .corponu-233-valor-manual-restante {
        display: none !important;
      }
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
        const auth = authMod.getAuth(app);
        const db = fs.getFirestore(app);
        return { app, auth, authMod, db, fs };
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
          .filter(item => item && item.ativo !== false)
      );
    }
    return precosPromise;
  }

  function encontrarPreco(movimento, precos) {
    const referencia = normalizar(movimento?.referencia || "");
    const processo = normalizar(movimento?.processo || movimento?.processoMovimentacao || "");
    if (!referencia || !processo) return null;

    const preco = (precos || []).find(item =>
      normalizar(item.referencia || "") === referencia &&
      normalizar(item.processo || item.servicoNome || "") === processo
    );

    if (!preco || numero(preco.valor, 0) <= 0) return null;
    return preco;
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
      lateralPronta: movimento.lateralPronta ?? null,
      lateralProntaStatus: movimento.lateralProntaStatus ?? "nao_informado",
      bojoPronto: movimento.bojoPronto ?? null,
      lateralProntaChegada: movimento.lateralProntaChegada ?? movimento.lateralPronta ?? null,
      lateralProntaChegadaStatus: movimento.lateralProntaChegadaStatus ?? movimento.lateralProntaStatus ?? "nao_informado",
      bojoProntoChegada: movimento.bojoProntoChegada ?? movimento.bojoPronto ?? null,
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
    const valorUnitario = preco ? numero(preco.valor, 0) : 0;
    const subtotal = qtd * valorUnitario;
    const descontoDefeito = numero(movimento.descontoDefeito ?? movimento.defeito ?? 0, 0);
    const total = Math.max(subtotal - descontoDefeito, 0);
    const processo = preco?.processo || movimento.processo || movimento.processoMovimentacao || "";
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
      faccao: movimento.destino || "",
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
      avisoPagamento: temPreco ? "" : `Adicionar valor para Ref. ${movimento.referencia || "-"} + ${movimento.processo || "-"}.`,
      observacoes: observacoes || (temPreco
        ? "Gerado automaticamente pela chegada complementar de Restantes pendentes, usando o preço configurado para REF + PROCESSO."
        : "Pagamento complementar ficou em aberto porque não existe valor cadastrado para REF + PROCESSO."),
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
      valor.closest("label")?.classList.add("corponu-233-valor-manual-restante");
    }

    const subtitulo = modal.querySelector(".modal-header p");
    if (subtitulo) subtitulo.textContent = "O pagamento será calculado automaticamente pela REF + processo configurados.";

    atualizarPreviewAutomatico();
  }

  function atualizarPreviewAutomatico() {
    const preview = document.getElementById("previewRestantePagamento");
    const input = document.getElementById("restPagQuantidadeRecebida");
    if (!preview || !input) return;
    const pendente = inteiro(input.max || input.value || 0);
    const recebida = inteiro(input.value || 0);
    const saldo = Math.max(pendente - recebida, 0);
    preview.innerHTML = `Recebidas agora: <strong>${recebida.toLocaleString("pt-BR")}</strong> peça(s).<br>${saldo > 0 ? `Novo saldo restante: <strong>${saldo.toLocaleString("pt-BR")}</strong> peça(s).` : "O restante será concluído."}<br>Pagamento: <strong>cálculo automático pela REF + processo</strong>.`;
  }

  async function salvarRecebimentoAutomatico(event) {
    const form = event.target;
    if (!form || form.id !== FORM_RESTANTE_ID) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (salvando) return;
    const restanteId = restanteSelecionadoId;
    if (!restanteId) {
      avisar("Não consegui identificar o restante selecionado. Feche a janela e abra novamente pela lista.", "erro");
      return;
    }

    const recebida = inteiro(document.getElementById("restPagQuantidadeRecebida")?.value);
    const dataChegada = document.getElementById("restPagDataChegada")?.value || "";
    const observacoes = document.getElementById("restPagObservacoes")?.value.trim() || "";
    const confirmado = document.getElementById("restPagConfirmacao")?.checked;
    const pendenteTela = inteiro(document.getElementById("restPagQuantidadeRecebida")?.max || 0);

    if (!recebida || !dataChegada || !confirmado) {
      avisar("Preencha e confira os campos obrigatórios.", "erro");
      return;
    }
    if (pendenteTela > 0 && recebida > pendenteTela) {
      avisar("A quantidade recebida é maior que o saldo pendente.", "erro");
      return;
    }

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
      const precos = await carregarPrecosAtivos(db, fs);
      const preco = encontrarPreco(previewMov, precos);

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
        const pagamento = dadosPagamentoAutomatico({
          movimento: movimentoPagamento,
          pagamentoId,
          quantidade: recebida,
          preco,
          usuario,
          fs,
          observacoes
        });
        transacao.set(pagamentoRef, pagamento, { merge: false });

        const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
        transacao.set(logRef, {
          acao: "chegada_complementar_restante_pagamento_automatico",
          entidade: "movimentacaoProducao",
          entidadeId: atual.id,
          detalhes: `OP ${atual.numeroOP || "-"} | ${atual.destino || "-"} | ${atual.processo || "-"} | pendente ${pendente} | recebido ${recebida} | saldo ${saldo} | ${preco ? `preço automático ${moeda(numero(preco.valor) * recebida)}` : "sem preço configurado"}`,
          usuarioId: usuario.uid,
          usuarioEmail: usuario.email || "",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });

        return {
          saldo,
          temPreco: Boolean(preco),
          total: preco ? Math.max(recebida * numero(preco.valor, 0), 0) : 0
        };
      });

      document.getElementById("modalReceberRestantePagamento")?.classList.add("hidden");
      restanteSelecionadoId = "";

      if (resultado.temPreco) {
        avisar(resultado.saldo > 0
          ? `Chegada salva e pagamento automático de ${moeda(resultado.total)} gerado. Ainda restam ${resultado.saldo.toLocaleString("pt-BR")} peça(s).`
          : `Chegada salva e pagamento automático de ${moeda(resultado.total)} gerado.`);
      } else {
        avisar(resultado.saldo > 0
          ? `Chegada salva. Ainda restam ${resultado.saldo.toLocaleString("pt-BR")} peça(s). O pagamento ficou pendente apenas porque não há preço configurado para REF + processo.`
          : "Chegada salva. O pagamento ficou pendente apenas porque não há preço configurado para REF + processo.");
      }

      setTimeout(() => document.getElementById("btnAtualizarRestantesPagamento")?.click(), 80);
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 350);
    } catch (error) {
      console.error("[CorpoNu 233] Erro ao receber restante com cálculo automático.", error);
      const mensagens = {
        SEM_USUARIO: "Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.",
        INEXISTENTE: "O restante não existe mais. Atualize a lista.",
        CONCLUIDO: "Esse restante já foi recebido ou concluído.",
        DUPLICADO: "Já existe pagamento para esta entrega complementar.",
        QUANTIDADE: "A quantidade informada é maior que o saldo atual."
      };
      avisar(mensagens[error?.message] || (String(error?.code || "").includes("permission-denied")
        ? "Sem permissão para registrar a chegada complementar."
        : "Não foi possível salvar. Nenhuma alteração foi gravada."), "erro");
    } finally {
      salvando = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoBotao;
      }
    }
  }

  async function repararPagamentosComplementaresAntigos() {
    if (reparoHistoricoIniciado) return;
    reparoHistoricoIniciado = true;

    try {
      const { auth, authMod, db, fs } = await obterFirebase();
      if (!auth.currentUser) {
        reparoHistoricoIniciado = false;
        const cancelar = authMod.onAuthStateChanged(auth, usuario => {
          if (!usuario) return;
          cancelar();
          setTimeout(repararPagamentosComplementaresAntigos, 700);
        });
        return;
      }

      const precos = await carregarPrecosAtivos(db, fs);
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("pagamentoComplementarRestante", "==", true)
      ));

      const alvos = snap.docs.filter(item => {
        const dados = item.data() || {};
        return dados.excluido !== true &&
          dados.pagamentoManualFinanceiro === true &&
          dados.valorPendente === true &&
          numero(dados.total, 0) <= 0;
      });

      if (!alvos.length) return;

      let corrigidos = 0;
      let comPreco = 0;
      let semPreco = 0;
      let batch = fs.writeBatch(db);
      let noBatch = 0;

      for (const item of alvos) {
        const dados = item.data() || {};
        const preco = encontrarPreco(dados, precos);
        const quantidade = inteiro(dados.quantidade || 0);
        const valorUnitario = preco ? numero(preco.valor, 0) : 0;
        const subtotal = quantidade * valorUnitario;
        const descontoDefeito = numero(dados.descontoDefeito, 0);
        const total = Math.max(subtotal - descontoDefeito, 0);
        const processo = preco?.processo || dados.processo || dados.processoMovimentacao || "";
        const setor = preco?.setor || dados.setor || setorDoProcesso(processo);

        batch.set(item.ref, {
          origemAntesCorrecao233: dados.origem || "",
          origem: "movimentacao",
          origemRestantePagamento: true,
          origemManualPagamentos: false,
          pagamentoManualFinanceiro: false,
          pagamentoComplementarRestante: true,
          precoReferenciaId: preco ? preco.id : "",
          servicoId: preco ? preco.id : "",
          processo,
          servicoNome: processo,
          setor,
          setorLabel: labelSetor(setor),
          subtotal: preco ? subtotal : 0,
          valorUnitario: preco ? valorUnitario : 0,
          total: preco ? total : 0,
          statusPagamento: preco ? "pendente" : "sem_valor",
          valorPendente: !preco,
          valorManualFinanceiroPendente: false,
          valorManualFinanceiro: false,
          valorTotalDefinidoManualmente: false,
          valorTotalManual: 0,
          formaValorPagamento: preco ? "preco_referencia_processo" : "preco_referencia_ausente",
          motivoValorPendente: preco ? "" : "preco_referencia_processo_ausente",
          avisoPagamento: preco ? "" : `Adicionar valor para Ref. ${dados.referencia || "-"} + ${dados.processo || "-"}.`,
          observacoes: preco
            ? "Corrigido automaticamente pela versão 233: pagamento complementar de restante recalculado pela REF + PROCESSO configurados."
            : "Corrigido pela versão 233: restante não é lançamento manual; pagamento segue pendente porque não existe preço para REF + PROCESSO.",
          corrigidoOrigemRestante233: true,
          corrigidoPor: auth.currentUser.uid,
          corrigidoEm: fs.serverTimestamp(),
          atualizadoPor: auth.currentUser.uid,
          atualizadoEm: fs.serverTimestamp(),
          versaoGeracao: VERSION,
          versaoRegistro: VERSION
        }, { merge: true });

        corrigidos += 1;
        if (preco) comPreco += 1;
        else semPreco += 1;
        noBatch += 1;

        if (noBatch >= 350) {
          await batch.commit();
          batch = fs.writeBatch(db);
          noBatch = 0;
        }
      }

      if (noBatch > 0) await batch.commit();

      const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
      await fs.setDoc(logRef, {
        acao: "correcao_pagamentos_complementares_restantes_233",
        entidade: "entregasPagamento",
        entidadeId: "restantes-233",
        detalhes: `${corrigidos} pagamento(s) complementar(es) corrigido(s): ${comPreco} recalculado(s) com preço configurado e ${semPreco} mantido(s) como pendência real de preço.`,
        usuarioId: auth.currentUser.uid,
        usuarioEmail: auth.currentUser.email || "",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });

      console.info(`[CorpoNu 233] Histórico corrigido: ${corrigidos} pagamento(s) complementar(es).`);
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 500);
    } catch (error) {
      console.warn("[CorpoNu 233] Não foi possível executar a correção histórica automática agora.", error);
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
      restanteSelecionadoId = String(botaoRestante.dataset.receberRestantePagamento || "").trim();
      setTimeout(prepararModalRestante, 0);
      setTimeout(prepararModalRestante, 80);
    }, true);

    document.addEventListener("submit", event => {
      if (bloquearChegadaManual(event)) return;
      if (event.target?.id === FORM_RESTANTE_ID) salvarRecebimentoAutomatico(event);
    }, true);

    document.addEventListener("input", event => {
      if (event.target?.id !== "restPagQuantidadeRecebida") return;
      setTimeout(atualizarPreviewAutomatico, 0);
    }, true);
  }

  function iniciar() {
    injetarProtecaoVisual();
    instalarEventos();
    setTimeout(repararPagamentosComplementaresAntigos, 1400);
    console.info(`[CorpoNu] Restantes com pagamento automático ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
