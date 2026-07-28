(() => {
  "use strict";

  const VERSION = "2026-07-28-historico-completo-op-1";
  const FIREBASE_VERSION = "10.12.5";
  const LOG_TYPES = Object.freeze([
    "ordemProducao",
    "ordensProducao",
    "movimentacaoProducao",
    "manejo",
    "ajusteMigracao",
    "entregaPagamento",
    "pagamento"
  ]);

  const state = {
    firebase: null,
    db: null,
    auth: null,
    perfil: null,
    consultando: false,
    observer: null,
    ultimoResultado: null
  };

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function normalizarOP(valor) {
    let texto = String(valor ?? "")
      .trim()
      .replace(/^OP\s*[-:#]?\s*/i, "")
      .replace(/\.0+$/, "")
      .trim();
    if (/^\d+$/.test(texto)) texto = texto.replace(/^0+(?=\d)/, "");
    return texto.toUpperCase();
  }

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numeroPtBR(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }

  function dataDe(valor, dataFimDoDia = false) {
    if (!valor) return null;
    try {
      if (typeof valor.toDate === "function") {
        const data = valor.toDate();
        return Number.isNaN(data.getTime()) ? null : data;
      }
      if (typeof valor === "object" && Number.isFinite(valor.seconds)) {
        const data = new Date(valor.seconds * 1000);
        return Number.isNaN(data.getTime()) ? null : data;
      }
      const texto = String(valor).trim();
      const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) {
        const data = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), dataFimDoDia ? 23 : 12, 0, 0, 0);
        return Number.isNaN(data.getTime()) ? null : data;
      }
      const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (br) {
        const ano = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
        const data = new Date(ano, Number(br[2]) - 1, Number(br[1]), dataFimDoDia ? 23 : 12, 0, 0, 0);
        return Number.isNaN(data.getTime()) ? null : data;
      }
      const data = new Date(valor);
      return Number.isNaN(data.getTime()) ? null : data;
    } catch {
      return null;
    }
  }

  function formatarDataHora(valor) {
    const data = valor instanceof Date ? valor : dataDe(valor);
    if (!data) return "Data não registrada";
    return data.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  function timestamp(valor) {
    return dataDe(valor)?.getTime() || 0;
  }

  function primeiraData(...valores) {
    for (const valor of valores.flat(Infinity)) {
      const data = dataDe(valor);
      if (data) return data;
    }
    return null;
  }

  function primeiroTexto(...valores) {
    for (const valor of valores.flat(Infinity)) {
      const texto = String(valor ?? "").trim();
      if (texto) return texto;
    }
    return "";
  }

  function tipoPeca(dado) {
    const texto = normalizar([
      dado?.tipoPeca,
      dado?.tipoPecaPadrao,
      dado?.setor,
      dado?.setorLabel,
      dado?.processo,
      dado?.processoPlanejado,
      dado?.origem
    ].filter(Boolean).join(" "));
    return texto.includes("CALCINHA") ? "Calcinha" : "Sutiã";
  }

  function linhaCalcinha(dado) {
    const texto = normalizar(dado?.linhaCalcinha || dado?.linha || dado?.colecao || "").replace(/\s+/g, "_");
    if (texto.includes("COTTON_LINE") || texto.includes("COTTON__LINE")) return "Cotton Line";
    if (texto.includes("CORPO_NU")) return "Corpo Nu";
    return "";
  }

  function mostrarAviso(mensagem, tipo = "info") {
    let toast = document.getElementById("auditoriaOpToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "auditoriaOpToast";
      document.body.appendChild(toast);
    }
    toast.dataset.tipo = tipo;
    toast.textContent = mensagem;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 6000);
  }

  async function inicializarFirebase() {
    if (state.firebase) return state.firebase;
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app = appModule.getApps()[0] || appModule.getApp();
    state.db = firestoreModule.getFirestore(app);
    state.auth = authModule.getAuth(app);
    state.firebase = { ...appModule, ...authModule, ...firestoreModule };
    return state.firebase;
  }

  async function carregarPerfil() {
    await inicializarFirebase();
    const user = state.auth.currentUser;
    if (!user) return null;
    try {
      const ref = state.firebase.doc(state.db, "usuarios", user.uid);
      let snap;
      try {
        snap = await state.firebase.getDocFromCache(ref);
      } catch {
        snap = await state.firebase.getDoc(ref);
      }
      state.perfil = snap.exists() ? { uid: user.uid, ...snap.data() } : null;
    } catch (error) {
      console.warn("[Auditoria OP] Perfil não carregado.", error);
    }
    return state.perfil;
  }

  function usuarioAtual() {
    return state.auth?.currentUser || null;
  }

  async function consultaSegura(referencia, rotulo) {
    try {
      return await state.firebase.getDocs(referencia);
    } catch (error) {
      console.warn(`[Auditoria OP] Consulta ${rotulo} não disponível.`, error);
      return null;
    }
  }

  async function buscarPorCampos(colecaoNome, campos, op) {
    const resultados = new Map();
    const valores = new Set([op]);
    if (/^\d+$/.test(op)) valores.add(Number(op));

    const consultas = [];
    campos.forEach(campo => {
      valores.forEach(valor => {
        consultas.push((async () => {
          const ref = state.firebase.query(
            state.firebase.collection(state.db, colecaoNome),
            state.firebase.where(campo, "==", valor)
          );
          const snap = await consultaSegura(ref, `${colecaoNome}.${campo}`);
          snap?.docs?.forEach(item => resultados.set(item.id, { id: item.id, ...item.data() }));
        })());
      });
    });
    await Promise.all(consultas);
    return [...resultados.values()];
  }

  function dividirEmBlocos(lista, tamanho = 30) {
    const blocos = [];
    for (let indice = 0; indice < lista.length; indice += tamanho) {
      blocos.push(lista.slice(indice, indice + tamanho));
    }
    return blocos;
  }

  async function buscarLogsOperacionais(alvoIds = []) {
    const mapa = new Map();
    const ids = [...new Set(alvoIds.map(item => String(item || "").trim()).filter(Boolean))];
    if (!ids.length) return [];

    // A consulta combina tipo operacional + IDs pertencentes à OP. Assim,
    // não é necessário ler toda a coleção de logs a cada pesquisa.
    const blocos = dividirEmBlocos(ids, 30);
    await Promise.all(LOG_TYPES.flatMap(tipo => blocos.map(async bloco => {
      const ref = state.firebase.query(
        state.firebase.collection(state.db, "logsAlteracoes"),
        state.firebase.where("tipoAlvo", "==", tipo),
        state.firebase.where("alvoId", "in", bloco)
      );
      const snap = await consultaSegura(ref, `logs.${tipo}`);
      snap?.docs?.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
    })));
    return [...mapa.values()];
  }

  function contemOP(texto, op) {
    const alvo = normalizarOP(op);
    if (!alvo) return false;
    const valor = String(texto || "");
    const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\b)OP\\s*[-:#]?\\s*0*${escapado}(?!\\d)`, "i");
    if (regex.test(valor)) return true;
    const inicio = normalizarOP(valor.split(/[|;]/)[0]);
    return inicio === alvo;
  }

  function registroPertenceOP(registro, op) {
    const alvo = normalizarOP(op);
    if (!alvo) return false;
    const candidatos = [
      registro?.numeroOP,
      registro?.numeroOPExterno,
      registro?.op,
      registro?.ordemNumero,
      registro?.opNumero,
      registro?.idOP
    ];
    return candidatos.some(item => normalizarOP(item) === alvo);
  }

  function nomeDoUsuario(uid, nomeExplicito, nomesPorUid) {
    const nome = primeiroTexto(nomeExplicito, nomesPorUid.get(String(uid || "")));
    if (nome) return nome;
    if (!uid) return "Sistema / não identificado";
    const atual = usuarioAtual();
    if (atual?.uid === uid) return state.perfil?.nome || atual.email || "Usuário atual";
    return `Usuário ${String(uid).slice(0, 8)}`;
  }

  function iconeCategoria(categoria) {
    const mapa = {
      cadastro: "OP",
      manejo: "M",
      envio: "→",
      chegada: "✓",
      reenvio: "↻",
      bipagem: "B",
      correcao: "✎",
      pagamento: "R$",
      exclusao: "×",
      sistema: "•"
    };
    return mapa[categoria] || "•";
  }

  function classeCategoria(categoria) {
    return ["cadastro", "manejo", "envio", "chegada", "reenvio", "bipagem", "correcao", "pagamento", "exclusao"]
      .includes(categoria) ? categoria : "sistema";
  }

  function labelAcao(acao) {
    const mapa = {
      ordem_criada: ["cadastro", "OP cadastrada"],
      ordem_atualizada: ["correcao", "OP atualizada"],
      ordem_excluida: ["exclusao", "OP excluída"],
      manejo_criado: ["manejo", "Manejo registrado"],
      manejo_atualizado: ["manejo", "Manejo atualizado"],
      manejo_excluido: ["exclusao", "Manejo removido"],
      op_bipada: ["bipagem", "OP bipada no Manejo"],
      movimentacao_criada: ["envio", "Envio registrado"],
      movimentacao_reenvio_criado: ["reenvio", "Reenvio registrado"],
      movimentacao_encaminhada: ["envio", "Etapa encaminhada"],
      movimentacao_retorno: ["chegada", "Chegada registrada"],
      chegada_manual_faccao: ["chegada", "Chegada manual registrada"],
      movimentacao_bipada: ["bipagem", "Movimentação bipada"],
      movimentacao_excluida: ["exclusao", "Movimentação excluída"],
      movimentacao_usuario_editada: ["correcao", "Movimentação corrigida"],
      movimentacao_usuario_excluida: ["exclusao", "Movimentação desfeita"],
      chegada_movimentacao_editada_usuario: ["correcao", "Chegada corrigida"],
      chegada_movimentacao_excluida_usuario: ["exclusao", "Chegada desfeita"],
      local_manejo_corrigido: ["correcao", "Localização corrigida"],
      ajuste_migracao: ["correcao", "Localização corrigida"],
      movimentacao_criada_calcinha: ["envio", "Envio de calcinha registrado"],
      historico_calcinhas_importado: ["cadastro", "Histórico de calcinhas importado"]
    };
    if (mapa[acao]) return mapa[acao];
    const texto = String(acao || "Ação registrada").replaceAll("_", " ");
    return ["sistema", texto.charAt(0).toUpperCase() + texto.slice(1)];
  }

  function criarEvento({
    id,
    categoria = "sistema",
    titulo,
    detalhes = "",
    data,
    usuarioUid = "",
    usuarioNome = "",
    origem = "",
    objetoId = "",
    tipo = "",
    prioridade = 0
  }, nomesPorUid) {
    const dataObj = data instanceof Date ? data : dataDe(data);
    return {
      id: String(id || `${categoria}-${Math.random()}`),
      categoria: classeCategoria(categoria),
      titulo: String(titulo || "Ação registrada"),
      detalhes: String(detalhes || ""),
      data: dataObj,
      ts: dataObj?.getTime() || 0,
      usuarioUid: String(usuarioUid || ""),
      usuarioNome: nomeDoUsuario(usuarioUid, usuarioNome, nomesPorUid),
      origem: String(origem || ""),
      objetoId: String(objetoId || ""),
      tipo: String(tipo || ""),
      prioridade: Number(prioridade || 0)
    };
  }

  function indexarNomes(logs) {
    const mapa = new Map();
    logs.forEach(log => {
      const uid = String(log.usuarioUid || log.criadoPor || "");
      const nome = primeiroTexto(log.usuarioNome, log.criadoPorNome, log.usuarioEmail);
      if (uid && nome && !mapa.has(uid)) mapa.set(uid, nome);
    });
    const atual = usuarioAtual();
    if (atual?.uid) mapa.set(atual.uid, state.perfil?.nome || atual.email || "Usuário atual");
    return mapa;
  }

  function detalhesOrdem(ordem) {
    const partes = [
      `Ref. ${ordem.referencia || "-"}`,
      `Cor ${ordem.cor || "-"}`,
      `Qtd. ${numeroPtBR(ordem.quantidade || ordem.qtd || ordem.planejado || 0)}`,
      tipoPeca(ordem)
    ];
    const linha = linhaCalcinha(ordem);
    if (linha) partes.push(linha);
    const necessidade = primeiroTexto(ordem.necessidadeTexto, ordem.necessidade, ordem.dataNecessidade);
    if (necessidade) partes.push(`Necessidade ${necessidade}`);
    return partes.join(" | ");
  }

  function eventosDasOrdens(ordens, logs, nomesPorUid) {
    const eventos = [];
    ordens.forEach(ordem => {
      const logCriacao = logs.find(log => log.alvoId === ordem.id && log.acao === "ordem_criada");
      const origemHistorica = normalizar(ordem.origem).includes("HISTOR") || normalizar(ordem.importacaoOrigem).includes("PLANILHA");
      eventos.push(criarEvento({
        id: `ordem-criada-${ordem.id}`,
        categoria: "cadastro",
        titulo: origemHistorica ? "OP importada do histórico" : "OP cadastrada no sistema",
        detalhes: detalhesOrdem(ordem),
        data: primeiraData(logCriacao?.criadoEm, ordem.criadoEm, ordem.importadoEm, ordem.dataCadastro),
        usuarioUid: logCriacao?.usuarioUid || ordem.criadoPor || ordem.importadoPor || "",
        usuarioNome: logCriacao?.usuarioNome || ordem.criadoPorNome || (origemHistorica ? "Importação histórica" : ""),
        origem: origemHistorica ? "Planilha histórica" : "Ordens de Produção",
        objetoId: ordem.id,
        tipo: "ordem"
      }, nomesPorUid));

      const atualizacao = primeiraData(ordem.atualizadoEm, ordem.updatedAt);
      if (atualizacao && (!eventos.at(-1)?.data || Math.abs(atualizacao.getTime() - eventos.at(-1).data.getTime()) > 60000)) {
        eventos.push(criarEvento({
          id: `ordem-atualizada-${ordem.id}`,
          categoria: "correcao",
          titulo: "Dados atuais da OP atualizados",
          detalhes: detalhesOrdem(ordem),
          data: atualizacao,
          usuarioUid: ordem.atualizadoPor || "",
          usuarioNome: ordem.atualizadoPorNome || "",
          origem: "Ordens de Produção",
          objetoId: ordem.id,
          tipo: "ordem",
          prioridade: -2
        }, nomesPorUid));
      }

      const manejos = [];
      if (ordem.manejo && typeof ordem.manejo === "object") manejos.push(["Sutiã / legado", ordem.manejo]);
      if (ordem.manejosSetores && typeof ordem.manejosSetores === "object") {
        Object.entries(ordem.manejosSetores).forEach(([setor, manejo]) => {
          if (manejo && typeof manejo === "object") manejos.push([setor === "calcinha" ? "Calcinha" : setor === "sutia" ? "Sutiã" : setor, manejo]);
        });
      }

      manejos.forEach(([setor, manejo], indice) => {
        const resumo = [
          manejo.fase ? `Fase ${manejo.fase}` : "",
          manejo.silk ? `Silk ${manejo.silk}` : "",
          manejo.dataTecido ? `Tecido ${manejo.dataTecido}` : "",
          manejo.localizacao ? `Local ${manejo.localizacao}` : "",
          manejo.faccao ? `Facção ${manejo.faccao}` : "",
          manejo.celu ? `Célula ${manejo.celu}` : "",
          manejo.necessidadeTexto || manejo.necessidade ? `Necessidade ${manejo.necessidadeTexto || manejo.necessidade}` : ""
        ].filter(Boolean).join(" | ") || "Manejo registrado";

        const criado = primeiraData(manejo.criadoEm);
        if (criado) {
          eventos.push(criarEvento({
            id: `manejo-criado-${ordem.id}-${indice}`,
            categoria: "manejo",
            titulo: `Manejo ${setor} iniciado`,
            detalhes: resumo,
            data: criado,
            usuarioUid: manejo.criadoPor || "",
            usuarioNome: manejo.criadoPorNome || "",
            origem: "Manejo",
            objetoId: ordem.id,
            tipo: "manejo"
          }, nomesPorUid));
        }

        const atualizado = primeiraData(manejo.atualizadoEm);
        if (atualizado && (!criado || Math.abs(atualizado.getTime() - criado.getTime()) > 60000)) {
          eventos.push(criarEvento({
            id: `manejo-atualizado-${ordem.id}-${indice}`,
            categoria: "manejo",
            titulo: `Manejo ${setor} atualizado`,
            detalhes: resumo,
            data: atualizado,
            usuarioUid: manejo.atualizadoPor || ordem.atualizadoPor || "",
            usuarioNome: manejo.atualizadoPorNome || ordem.atualizadoPorNome || "",
            origem: "Manejo",
            objetoId: ordem.id,
            tipo: "manejo",
            prioridade: -1
          }, nomesPorUid));
        }

        const bipado = primeiraData(manejo.bipadoEm);
        if (manejo.bipado === true || manejo.status === "bipado" || bipado) {
          eventos.push(criarEvento({
            id: `manejo-bipado-${ordem.id}-${indice}`,
            categoria: "bipagem",
            titulo: `Manejo ${setor} finalizado / bipado`,
            detalhes: resumo,
            data: bipado || atualizado || criado,
            usuarioUid: manejo.bipadoPor || manejo.atualizadoPor || "",
            usuarioNome: manejo.bipadoPorNome || manejo.atualizadoPorNome || "",
            origem: "Manejo",
            objetoId: ordem.id,
            tipo: "bipagem",
            prioridade: 2
          }, nomesPorUid));
        }
      });
    });
    return eventos;
  }

  function labelDestino(mov) {
    const tipo = normalizar(mov.tipoDestino || mov.tipo || mov.tipoDestinoLabel);
    return tipo.includes("CEL") ? "Célula" : "Facção";
  }

  function eventosDasMovimentacoes(movimentos, nomesPorUid) {
    const eventos = [];
    movimentos.forEach(mov => {
      const reenvio = Boolean(mov.reenvio || mov.movimentacaoOrigemId || normalizar(mov.origem).includes("REENVIO"));
      const destino = mov.destino || mov.faccao || mov.celula || "Destino não informado";
      const processo = mov.processo || "Processo não informado";
      const quantidade = Number(mov.quantidadeEnviada || mov.quantidade || 0);
      const envioData = primeiraData(mov.criadoEm, mov.dataEnvio, mov.enviadoEm);
      eventos.push(criarEvento({
        id: `mov-envio-${mov.id}`,
        categoria: reenvio ? "reenvio" : "envio",
        titulo: reenvio ? `Reenviada para ${labelDestino(mov)}` : `Enviada para ${labelDestino(mov)}`,
        detalhes: `${destino} | ${processo} | ${numeroPtBR(quantidade)} peças`,
        data: envioData,
        usuarioUid: mov.criadoPor || mov.enviadoPor || "",
        usuarioNome: mov.criadoPorNome || mov.enviadoPorNome || "",
        origem: labelDestino(mov),
        objetoId: mov.id,
        tipo: reenvio ? "reenvio" : "envio"
      }, nomesPorUid));

      if (mov.dataChegada || ["retornou", "encaminhado", "finalizado"].includes(mov.status)) {
        const recebida = Number(mov.quantidadeRecebida ?? Math.max(quantidade - Number(mov.falta || 0), 0));
        eventos.push(criarEvento({
          id: `mov-chegada-${mov.id}`,
          categoria: "chegada",
          titulo: `Chegada de ${labelDestino(mov)} registrada`,
          detalhes: `${destino} | ${processo} | Recebidas ${numeroPtBR(recebida)} | Falta ${numeroPtBR(mov.falta || 0)}${Number(mov.descontoDefeito || mov.defeito || 0) ? ` | Desconto ${numeroPtBR(mov.descontoDefeito || mov.defeito)}` : ""}`,
          data: primeiraData(mov.chegadaEm, mov.atualizadoEm, mov.dataChegada),
          usuarioUid: mov.chegadaPor || mov.atualizadoPor || "",
          usuarioNome: mov.chegadaPorNome || mov.atualizadoPorNome || "",
          origem: labelDestino(mov),
          objetoId: mov.id,
          tipo: "chegada",
          prioridade: 1
        }, nomesPorUid));
      }

      if (mov.status === "encaminhado") {
        eventos.push(criarEvento({
          id: `mov-encaminhado-${mov.id}`,
          categoria: "envio",
          titulo: "Etapa encaminhada para o próximo processo",
          detalhes: `${destino} | ${processo}`,
          data: primeiraData(mov.encaminhadoEm, mov.atualizadoEm),
          usuarioUid: mov.encaminhadoPor || mov.atualizadoPor || "",
          usuarioNome: mov.encaminhadoPorNome || mov.atualizadoPorNome || "",
          origem: "Rastreamento",
          objetoId: mov.id,
          tipo: "encaminhamento"
        }, nomesPorUid));
      }

      if (mov.bipado === true || mov.status === "finalizado" || mov.bipadoEm) {
        eventos.push(criarEvento({
          id: `mov-bipado-${mov.id}`,
          categoria: "bipagem",
          titulo: "Movimentação finalizada / bipada",
          detalhes: `${destino} | ${processo}`,
          data: primeiraData(mov.bipadoEm, mov.atualizadoEm, mov.dataChegada),
          usuarioUid: mov.bipadoPor || mov.atualizadoPor || "",
          usuarioNome: mov.bipadoPorNome || mov.atualizadoPorNome || "",
          origem: "Rastreamento",
          objetoId: mov.id,
          tipo: "bipagem",
          prioridade: 2
        }, nomesPorUid));
      }

      if (mov.cancelado === true || mov.excluido === true) {
        eventos.push(criarEvento({
          id: `mov-cancelado-${mov.id}`,
          categoria: "exclusao",
          titulo: "Movimentação cancelada",
          detalhes: primeiroTexto(mov.motivoCancelamento, mov.observacoes, `${destino} | ${processo}`),
          data: primeiraData(mov.canceladoEm, mov.excluidoEm, mov.atualizadoEm),
          usuarioUid: mov.canceladoPor || mov.excluidoPor || mov.atualizadoPor || "",
          usuarioNome: mov.canceladoPorNome || mov.excluidoPorNome || mov.atualizadoPorNome || "",
          origem: "Rastreamento",
          objetoId: mov.id,
          tipo: "exclusao"
        }, nomesPorUid));
      }
    });
    return eventos;
  }

  function eventosDosAjustes(ajustes, nomesPorUid) {
    return ajustes.map(ajuste => criarEvento({
      id: `ajuste-${ajuste.id}`,
      categoria: "correcao",
      titulo: "Localização ou processo corrigido",
      detalhes: [
        ajuste.localAnterior || ajuste.origemAnterior ? `Antes: ${ajuste.localAnterior || ajuste.origemAnterior}` : "",
        ajuste.localNovo || ajuste.destino || ajuste.local ? `Depois: ${ajuste.localNovo || ajuste.destino || ajuste.local}` : "",
        ajuste.processo ? `Processo: ${ajuste.processo}` : "",
        ajuste.motivo ? `Motivo: ${ajuste.motivo}` : ""
      ].filter(Boolean).join(" | ") || "Correção manual registrada",
      data: primeiraData(ajuste.criadoEm, ajuste.atualizadoEm, ajuste.data),
      usuarioUid: ajuste.criadoPor || ajuste.usuarioUid || "",
      usuarioNome: ajuste.criadoPorNome || ajuste.usuarioNome || "",
      origem: "Correção de local",
      objetoId: ajuste.id,
      tipo: "correcao"
    }, nomesPorUid));
  }

  function eventosDosPagamentos(pagamentos, nomesPorUid) {
    const eventos = [];
    pagamentos.forEach(item => {
      eventos.push(criarEvento({
        id: `pagamento-criado-${item.id}`,
        categoria: "pagamento",
        titulo: item.valorPendente ? "Pagamento pendente de valor" : "Pagamento gerado",
        detalhes: `${item.faccao || item.destino || "Facção"} | ${item.processo || item.servicoNome || "Processo"} | ${numeroPtBR(item.quantidade || 0)} peças`,
        data: primeiraData(item.criadoEm, item.dataEntrega),
        usuarioUid: item.criadoPor || "",
        usuarioNome: item.criadoPorNome || "",
        origem: "Pagamentos",
        objetoId: item.id,
        tipo: "pagamento"
      }, nomesPorUid));
      if (item.statusPagamento === "pago") {
        eventos.push(criarEvento({
          id: `pagamento-pago-${item.id}`,
          categoria: "pagamento",
          titulo: "Pagamento marcado como pago",
          detalhes: `${item.faccao || item.destino || "Facção"} | ${item.processo || item.servicoNome || "Processo"}`,
          data: primeiraData(item.pagoEm, item.atualizadoEm, item.dataPagamento),
          usuarioUid: item.pagoPor || item.atualizadoPor || "",
          usuarioNome: item.pagoPorNome || item.atualizadoPorNome || "",
          origem: "Pagamentos",
          objetoId: item.id,
          tipo: "pagamento",
          prioridade: 1
        }, nomesPorUid));
      }
    });
    return eventos;
  }

  function eventosDosLogs(logs, nomesPorUid) {
    return logs.map(log => {
      const [categoria, titulo] = labelAcao(log.acao);
      return criarEvento({
        id: `log-${log.id}`,
        categoria,
        titulo,
        detalhes: log.detalhes || "Ação registrada no sistema",
        data: log.criadoEm,
        usuarioUid: log.usuarioUid || "",
        usuarioNome: log.usuarioNome || log.usuarioEmail || "",
        origem: "Log do sistema",
        objetoId: log.alvoId || "",
        tipo: String(log.acao || "")
      }, nomesPorUid);
    });
  }

  function deduplicarEventos(eventos) {
    const ordenados = [...eventos].sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts;
      return a.prioridade - b.prioridade;
    });
    const resultado = [];
    for (const evento of ordenados) {
      const duplicado = resultado.find(item => {
        if (evento.objetoId && item.objetoId && evento.objetoId !== item.objetoId) return false;
        const mesmaFamilia = evento.categoria === item.categoria || evento.tipo === item.tipo;
        if (!mesmaFamilia) return false;
        if (evento.ts && item.ts && Math.abs(evento.ts - item.ts) <= 120000) return true;
        return normalizar(evento.titulo) === normalizar(item.titulo)
          && normalizar(evento.detalhes) === normalizar(item.detalhes)
          && Math.abs(evento.ts - item.ts) <= 86400000;
      });
      if (!duplicado) {
        resultado.push(evento);
        continue;
      }
      const eventoMelhor = evento.origem === "Log do sistema" || evento.usuarioNome !== "Sistema / não identificado";
      if (eventoMelhor) {
        duplicado.usuarioNome = evento.usuarioNome || duplicado.usuarioNome;
        duplicado.usuarioUid = evento.usuarioUid || duplicado.usuarioUid;
        duplicado.data = evento.data || duplicado.data;
        duplicado.ts = evento.ts || duplicado.ts;
        duplicado.detalhes = evento.detalhes.length >= duplicado.detalhes.length ? evento.detalhes : duplicado.detalhes;
        duplicado.origem = `${duplicado.origem}${duplicado.origem && evento.origem ? " + " : ""}${evento.origem}`;
      }
    }
    return resultado.sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts;
      return a.prioridade - b.prioridade;
    });
  }

  function localAtual(ordens, movimentos) {
    const ordenados = [...movimentos].sort((a, b) => {
      const da = timestamp(a.bipadoEm || a.atualizadoEm || a.criadoEm || a.dataChegada || a.dataEnvio);
      const db = timestamp(b.bipadoEm || b.atualizadoEm || b.criadoEm || b.dataChegada || b.dataEnvio);
      return db - da;
    });
    const ultima = ordenados[0];
    if (ultima) {
      if (ultima.status === "finalizado" || ultima.bipado === true) return `Finalizada / bipada em ${ultima.destino || "destino"}`;
      if (ultima.status === "encaminhado") return `Encaminhada após ${ultima.destino || "etapa anterior"}`;
      if (ultima.status === "retornou") return `Retornou de ${ultima.destino || "destino"}`;
      return `${labelDestino(ultima)}: ${ultima.destino || "não informado"}`;
    }
    for (const ordem of ordens) {
      const manejo = ordem.manejosSetores?.calcinha || ordem.manejosSetores?.sutia || ordem.manejo;
      const local = primeiroTexto(manejo?.localizacao, manejo?.fase, ordem.localizacao, ordem.status);
      if (local) return local;
    }
    return "Sem movimentação registrada";
  }

  function montarResumo(op, ordens, movimentos, eventos) {
    const refs = [...new Set(ordens.map(item => String(item.referencia || "").trim()).filter(Boolean))];
    const cores = [...new Set(ordens.map(item => String(item.cor || "").trim()).filter(Boolean))];
    const tipos = [...new Set(ordens.map(tipoPeca))];
    const linhas = [...new Set(ordens.map(linhaCalcinha).filter(Boolean))];
    const quantidade = ordens.reduce((total, item) => total + Number(item.quantidade || item.qtd || item.planejado || 0), 0);
    return {
      op,
      refs: refs.join(", ") || "-",
      cores: cores.join(", ") || "-",
      tipo: tipos.join(" / ") || "-",
      linha: linhas.join(" / "),
      quantidade,
      local: localAtual(ordens, movimentos),
      etapas: eventos.length,
      movimentos: movimentos.length
    };
  }

  async function consultarOP(valor) {
    const op = normalizarOP(valor);
    if (!op) {
      mostrarAviso("Digite o número da OP para consultar o histórico.", "erro");
      document.getElementById("auditoriaOpBusca")?.focus();
      return;
    }
    if (state.consultando) return;
    state.consultando = true;
    atualizarEstadoCarregando(true, op);

    try {
      await inicializarFirebase();
      await carregarPerfil();
      if (!usuarioAtual()) throw new Error("Usuário não autenticado.");

      const [ordens, movimentos, ajustes, pagamentos] = await Promise.all([
        buscarPorCampos("ordensProducao", ["numeroOP", "numeroOPExterno", "op", "ordemNumero"], op),
        buscarPorCampos("movimentacoesProducao", ["numeroOP", "op", "ordemNumero"], op),
        buscarPorCampos("ajustesMigracao", ["numeroOP", "op", "ordemNumero"], op),
        buscarPorCampos("entregasPagamento", ["numeroOP", "op", "ordemNumero"], op)
      ]);

      const alvosDaOP = [
        op,
        ...ordens.map(item => item.id),
        ...movimentos.map(item => item.id),
        ...ajustes.map(item => item.id),
        ...pagamentos.map(item => item.id)
      ];
      const logsTodos = await buscarLogsOperacionais(alvosDaOP);
      const orderIds = new Set(ordens.map(item => item.id));
      const movementIds = new Set(movimentos.map(item => item.id));
      const paymentIds = new Set(pagamentos.map(item => item.id));
      const adjustmentIds = new Set(ajustes.map(item => item.id));
      const logs = logsTodos.filter(log => {
        const alvo = String(log.alvoId || "");
        return orderIds.has(alvo)
          || movementIds.has(alvo)
          || paymentIds.has(alvo)
          || adjustmentIds.has(alvo)
          || alvo === op
          || contemOP(log.detalhes, op)
          || registroPertenceOP(log, op);
      });

      if (!ordens.length && !movimentos.length && !logs.length) {
        renderSemResultado(op);
        return;
      }

      const nomesPorUid = indexarNomes(logs);
      const eventos = deduplicarEventos([
        ...eventosDasOrdens(ordens, logs, nomesPorUid),
        ...eventosDasMovimentacoes(movimentos, nomesPorUid),
        ...eventosDosAjustes(ajustes, nomesPorUid),
        ...eventosDosPagamentos(pagamentos, nomesPorUid),
        ...eventosDosLogs(logs, nomesPorUid)
      ]);
      const resumo = montarResumo(op, ordens, movimentos, eventos);
      state.ultimoResultado = { op, ordens, movimentos, ajustes, pagamentos, logs, eventos, resumo };
      renderResultado(state.ultimoResultado);
    } catch (error) {
      console.error("[Auditoria OP] Falha na consulta.", error);
      renderErro(error);
    } finally {
      state.consultando = false;
      atualizarEstadoCarregando(false, op);
    }
  }

  function atualizarEstadoCarregando(carregando, op = "") {
    const botao = document.getElementById("auditoriaOpConsultar");
    const input = document.getElementById("auditoriaOpBusca");
    if (botao) {
      botao.disabled = carregando;
      botao.textContent = carregando ? `Consultando OP ${op}...` : "Consultar histórico";
    }
    if (input) input.disabled = carregando;
    const area = document.getElementById("auditoriaOpResultado");
    if (carregando && area) {
      area.classList.remove("hidden");
      area.innerHTML = `
        <div class="auditoria-op-loading">
          <span class="auditoria-op-spinner"></span>
          <strong>Montando a linha do tempo da OP ${escaparHtml(op)}</strong>
          <small>Consultando ordens, manejo, movimentações, correções e logs.</small>
        </div>`;
    }
  }

  function renderSemResultado(op) {
    const area = document.getElementById("auditoriaOpResultado");
    if (!area) return;
    area.classList.remove("hidden");
    area.innerHTML = `
      <div class="auditoria-op-empty">
        <strong>Nenhum histórico encontrado para a OP ${escaparHtml(op)}.</strong>
        <span>Confira o número digitado. OPs históricas muito antigas podem não ter usuário registrado em todas as etapas.</span>
      </div>`;
  }

  function renderErro(error) {
    const area = document.getElementById("auditoriaOpResultado");
    if (!area) return;
    const permissao = error?.code === "permission-denied" || String(error?.message || "").includes("permission");
    area.classList.remove("hidden");
    area.innerHTML = `
      <div class="auditoria-op-empty erro">
        <strong>${permissao ? "As regras do Firebase ainda não liberaram a auditoria operacional." : "Não foi possível carregar o histórico."}</strong>
        <span>${permissao ? "Publique o firebase-rules.txt desta atualização e tente novamente." : escaparHtml(error?.message || "Atualize a tela e tente novamente.")}</span>
      </div>`;
  }

  function renderResultado(resultado) {
    const { resumo, eventos } = resultado;
    const area = document.getElementById("auditoriaOpResultado");
    if (!area) return;
    area.classList.remove("hidden");
    area.innerHTML = `
      <div class="auditoria-op-result-header">
        <div>
          <span class="auditoria-op-kicker">Histórico completo</span>
          <h4>OP ${escaparHtml(resumo.op)}</h4>
          <p>${escaparHtml(resumo.tipo)}${resumo.linha ? ` • ${escaparHtml(resumo.linha)}` : ""} • Ref. ${escaparHtml(resumo.refs)} • ${escaparHtml(resumo.cores)}</p>
        </div>
        <div class="auditoria-op-result-actions">
          <button class="btn btn-print" id="auditoriaOpImprimir" type="button">Imprimir histórico</button>
          <button class="btn" id="auditoriaOpFechar" type="button">Fechar</button>
        </div>
      </div>
      <div class="auditoria-op-summary">
        <div><span>Quantidade da OP</span><strong>${escaparHtml(numeroPtBR(resumo.quantidade))}</strong></div>
        <div><span>Movimentações</span><strong>${escaparHtml(resumo.movimentos)}</strong></div>
        <div><span>Eventos encontrados</span><strong>${escaparHtml(resumo.etapas)}</strong></div>
        <div class="wide"><span>Local / situação atual</span><strong>${escaparHtml(resumo.local)}</strong></div>
      </div>
      <div class="auditoria-op-note">
        <strong>Quem fez:</strong> o nome vem do log salvo no momento da ação. Em dados importados ou muito antigos, o sistema poderá mostrar “Importação histórica” ou o identificador do usuário.
      </div>
      <div class="auditoria-op-timeline">
        ${eventos.length ? eventos.map(renderEvento).join("") : `
          <div class="auditoria-op-empty"><strong>A OP existe, mas ainda não possui etapas registradas.</strong></div>`}
      </div>`;

    document.getElementById("auditoriaOpFechar")?.addEventListener("click", () => {
      area.classList.add("hidden");
      area.innerHTML = "";
    });
    document.getElementById("auditoriaOpImprimir")?.addEventListener("click", imprimirUltimoResultado);
  }

  function renderEvento(evento, indice) {
    const inicial = escaparHtml((evento.usuarioNome || "S").trim().charAt(0).toUpperCase() || "S");
    return `
      <article class="auditoria-op-event ${escaparHtml(evento.categoria)}">
        <div class="auditoria-op-axis">
          <span class="auditoria-op-icon">${escaparHtml(iconeCategoria(evento.categoria))}</span>
          <span class="auditoria-op-line"></span>
        </div>
        <div class="auditoria-op-event-card">
          <div class="auditoria-op-event-top">
            <div>
              <span class="auditoria-op-step">Etapa ${indice + 1}</span>
              <h5>${escaparHtml(evento.titulo)}</h5>
            </div>
            <time>${escaparHtml(formatarDataHora(evento.data))}</time>
          </div>
          ${evento.detalhes ? `<p>${escaparHtml(evento.detalhes)}</p>` : ""}
          <div class="auditoria-op-user">
            <span class="auditoria-op-avatar">${inicial}</span>
            <div>
              <strong>${escaparHtml(evento.usuarioNome)}</strong>
              <small>${escaparHtml(evento.origem || "Sistema")}${evento.usuarioUid ? ` • UID ${escaparHtml(evento.usuarioUid.slice(0, 8))}` : ""}</small>
            </div>
          </div>
        </div>
      </article>`;
  }

  function imprimirUltimoResultado() {
    const resultado = state.ultimoResultado;
    if (!resultado) return;
    const janela = window.open("", "_blank", "width=1100,height=850");
    if (!janela) {
      mostrarAviso("O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.", "erro");
      return;
    }
    const { resumo, eventos } = resultado;
    const linhas = eventos.map((evento, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${escaparHtml(formatarDataHora(evento.data))}</td>
        <td>${escaparHtml(evento.titulo)}</td>
        <td>${escaparHtml(evento.detalhes)}</td>
        <td>${escaparHtml(evento.usuarioNome)}</td>
        <td>${escaparHtml(evento.origem)}</td>
      </tr>`).join("");
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Histórico OP ${escaparHtml(resumo.op)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111827;margin:24px}h1{margin:0 0 5px;font-size:24px}p{margin:3px 0 12px;color:#475569}.resumo{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.resumo div{border:1px solid #cbd5e1;padding:10px;border-radius:8px}.resumo span{display:block;font-size:10px;color:#64748b;text-transform:uppercase}.resumo strong{font-size:14px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top}th{background:#e2e8f0}@page{size:landscape;margin:10mm}
      </style></head><body>
      <h1>Histórico completo da OP ${escaparHtml(resumo.op)}</h1>
      <p>${escaparHtml(resumo.tipo)}${resumo.linha ? ` • ${escaparHtml(resumo.linha)}` : ""} • Ref. ${escaparHtml(resumo.refs)} • ${escaparHtml(resumo.cores)}</p>
      <div class="resumo"><div><span>Quantidade</span><strong>${escaparHtml(numeroPtBR(resumo.quantidade))}</strong></div><div><span>Movimentações</span><strong>${resumo.movimentos}</strong></div><div><span>Eventos</span><strong>${resumo.etapas}</strong></div><div><span>Situação atual</span><strong>${escaparHtml(resumo.local)}</strong></div></div>
      <table><thead><tr><th>#</th><th>Data/hora</th><th>Ação</th><th>Detalhes</th><th>Usuário</th><th>Origem</th></tr></thead><tbody>${linhas || '<tr><td colspan="6">Sem eventos.</td></tr>'}</tbody></table>
      </body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 250);
  }

  function injetarEstilos() {
    if (document.getElementById("auditoriaOpStyles")) return;
    const style = document.createElement("style");
    style.id = "auditoriaOpStyles";
    style.textContent = `
      #auditoriaOpToast{position:fixed;right:18px;bottom:18px;z-index:100000;max-width:420px;padding:13px 16px;border-radius:13px;background:#172033;color:#fff;font:800 13px/1.4 Arial,sans-serif;box-shadow:0 18px 44px rgba(15,23,42,.28);opacity:0;transform:translateY(12px);pointer-events:none;transition:.18s ease}#auditoriaOpToast.show{opacity:1;transform:translateY(0)}#auditoriaOpToast[data-tipo="erro"]{background:#991b1b}
      .auditoria-op-panel{margin-top:16px;border:1px solid #c8d6e6;background:linear-gradient(180deg,#f8fbff 0,#fff 100%);border-radius:16px;padding:16px;box-shadow:0 10px 28px rgba(30,64,100,.08)}
      .auditoria-op-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}.auditoria-op-head h3{margin:0 0 4px;font-size:18px;color:#173c69}.auditoria-op-head p{margin:0;color:#5b6f85;font-size:12px;max-width:720px}.auditoria-op-search{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.auditoria-op-search input{min-width:240px;border:1px solid #b9cadc;border-radius:10px;padding:10px 12px;font-weight:800;background:#fff}.auditoria-op-search input:focus{outline:3px solid rgba(37,99,235,.14);border-color:#2563eb}
      #auditoriaOpResultado{margin-top:16px}.auditoria-op-result-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px;background:#173c69;color:#fff;border-radius:14px 14px 0 0}.auditoria-op-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.12em;opacity:.75;font-weight:900}.auditoria-op-result-header h4{font-size:24px;margin:2px 0}.auditoria-op-result-header p{margin:0;font-size:12px;opacity:.9}.auditoria-op-result-actions{display:flex;gap:8px;flex-wrap:wrap}.auditoria-op-result-actions .btn{white-space:nowrap}
      .auditoria-op-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#d9e4ef;border:1px solid #d9e4ef}.auditoria-op-summary>div{background:#fff;padding:12px}.auditoria-op-summary span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:900}.auditoria-op-summary strong{display:block;margin-top:4px;color:#18324e;font-size:14px}.auditoria-op-summary .wide{grid-column:auto}.auditoria-op-note{padding:10px 13px;background:#fff8df;border:1px solid #efd48b;border-top:0;color:#73510d;font-size:11px}
      .auditoria-op-timeline{padding:18px 10px 8px;background:#f7f9fc;border:1px solid #d9e4ef;border-top:0;border-radius:0 0 14px 14px}.auditoria-op-event{display:grid;grid-template-columns:42px 1fr;gap:10px;position:relative}.auditoria-op-axis{display:flex;flex-direction:column;align-items:center}.auditoria-op-icon{display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:999px;background:#475569;color:#fff;font-weight:950;font-size:11px;z-index:2;box-shadow:0 0 0 5px #f7f9fc}.auditoria-op-line{width:2px;min-height:24px;flex:1;background:#ccd8e5}.auditoria-op-event:last-child .auditoria-op-line{background:transparent}.auditoria-op-event-card{margin-bottom:14px;background:#fff;border:1px solid #d7e1ec;border-radius:12px;padding:12px 14px;box-shadow:0 5px 14px rgba(15,23,42,.05)}.auditoria-op-event-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.auditoria-op-step{display:block;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:900}.auditoria-op-event h5{margin:2px 0 0;font-size:14px;color:#172b43}.auditoria-op-event time{font-size:10px;color:#60758c;white-space:nowrap;font-weight:800}.auditoria-op-event-card>p{margin:8px 0 10px;color:#465b72;font-size:12px;line-height:1.45}.auditoria-op-user{display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px dashed #dbe4ee}.auditoria-op-avatar{display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:#e5edf6;color:#173c69;font-weight:950}.auditoria-op-user strong{display:block;font-size:11px;color:#263c54}.auditoria-op-user small{display:block;font-size:9px;color:#718398;margin-top:1px}
      .auditoria-op-event.cadastro .auditoria-op-icon{background:#2563eb}.auditoria-op-event.manejo .auditoria-op-icon{background:#7c3aed}.auditoria-op-event.envio .auditoria-op-icon{background:#d97706}.auditoria-op-event.chegada .auditoria-op-icon{background:#16a34a}.auditoria-op-event.reenvio .auditoria-op-icon{background:#ea580c}.auditoria-op-event.bipagem .auditoria-op-icon{background:#111827}.auditoria-op-event.correcao .auditoria-op-icon{background:#0891b2}.auditoria-op-event.pagamento .auditoria-op-icon{background:#15803d}.auditoria-op-event.exclusao .auditoria-op-icon{background:#dc2626}
      .auditoria-op-loading,.auditoria-op-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:150px;padding:24px;border:1px dashed #b8c9da;border-radius:13px;background:#fff;color:#41566d}.auditoria-op-loading small,.auditoria-op-empty span{margin-top:6px;font-size:11px;color:#718398}.auditoria-op-empty.erro{border-color:#f0a4a4;background:#fff5f5;color:#991b1b}.auditoria-op-spinner{width:30px;height:30px;border-radius:50%;border:3px solid #d8e4f0;border-top-color:#2563eb;animation:auditoriaOpSpin .8s linear infinite;margin-bottom:10px}@keyframes auditoriaOpSpin{to{transform:rotate(360deg)}}
      .btn-historico-op-linha{background:#5b21b6!important;color:#fff!important;border-color:#5b21b6!important}.btn-historico-op-linha:hover{filter:brightness(1.08)}
      @media(max-width:900px){.auditoria-op-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.auditoria-op-result-header{flex-direction:column}.auditoria-op-event-top{flex-direction:column}.auditoria-op-event time{white-space:normal}.auditoria-op-search{width:100%}.auditoria-op-search input{min-width:0;flex:1}}
      @media(max-width:560px){.auditoria-op-panel{padding:12px}.auditoria-op-summary{grid-template-columns:1fr}.auditoria-op-event{grid-template-columns:34px 1fr;gap:6px}.auditoria-op-icon{width:28px;height:28px}.auditoria-op-event-card{padding:10px}.auditoria-op-search .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function injetarPainel() {
    const pagina = document.getElementById("rastreamento");
    const painelOriginal = pagina?.querySelector(".rastreamento-panel");
    if (!pagina || !painelOriginal || document.getElementById("auditoriaOpPainel")) return false;
    const painel = document.createElement("section");
    painel.id = "auditoriaOpPainel";
    painel.className = "auditoria-op-panel";
    painel.innerHTML = `
      <div class="auditoria-op-head">
        <div>
          <h3>Linha do tempo completa da OP</h3>
          <p>Veja todos os processos encontrados para uma OP e quem registrou cada ação: cadastro, Manejo, envio, chegada, reenvio, correção e bipagem.</p>
        </div>
        <form class="auditoria-op-search" id="auditoriaOpForm">
          <input id="auditoriaOpBusca" type="text" inputmode="numeric" autocomplete="off" placeholder="Digite o número da OP" aria-label="Número da OP" />
          <button class="btn btn-primary" id="auditoriaOpConsultar" type="submit">Consultar histórico</button>
        </form>
      </div>
      <div id="auditoriaOpResultado" class="hidden"></div>`;
    painelOriginal.after(painel);
    painel.querySelector("#auditoriaOpForm")?.addEventListener("submit", event => {
      event.preventDefault();
      consultarOP(document.getElementById("auditoriaOpBusca")?.value || "");
    });
    return true;
  }

  function obterOPDaLinha(linha) {
    if (!linha) return "";
    const primeira = linha.cells?.[0];
    return normalizarOP(primeira?.querySelector("input")?.value || primeira?.textContent || linha.dataset?.op || "");
  }

  function adicionarBotoesNasLinhas() {
    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) return;
    tbody.querySelectorAll("tr").forEach(linha => {
      const op = obterOPDaLinha(linha);
      if (!op) return;
      const celulaAcoes = linha.cells?.[linha.cells.length - 1];
      if (!celulaAcoes || celulaAcoes.querySelector(".btn-historico-op-linha")) return;
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "btn btn-sm btn-historico-op-linha";
      botao.textContent = "Histórico";
      botao.title = `Ver todos os processos e usuários da OP ${op}`;
      botao.dataset.op = op;
      botao.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const input = document.getElementById("auditoriaOpBusca");
        if (input) input.value = op;
        document.getElementById("auditoriaOpPainel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        consultarOP(op);
      });
      celulaAcoes.prepend(botao);
    });
  }

  function observarTabela() {
    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) return false;
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(() => adicionarBotoesNasLinhas());
    state.observer.observe(tbody, { childList: true, subtree: true });
    adicionarBotoesNasLinhas();
    return true;
  }

  function integrarBuscaExistente() {
    const busca = document.getElementById("buscaRastreamento");
    if (!busca || busca.dataset.auditoriaOpIntegrada === "1") return;
    busca.dataset.auditoriaOpIntegrada = "1";
    busca.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const op = normalizarOP(busca.value);
      if (!/^\d+$/.test(op)) return;
      event.preventDefault();
      const input = document.getElementById("auditoriaOpBusca");
      if (input) input.value = op;
      consultarOP(op);
    });
  }

  function iniciar() {
    injetarEstilos();
    const tentar = () => {
      const painelOk = injetarPainel() || Boolean(document.getElementById("auditoriaOpPainel"));
      const tabelaOk = observarTabela() || Boolean(document.getElementById("listaRastreamento"));
      integrarBuscaExistente();
      if (!painelOk || !tabelaOk) setTimeout(tentar, 350);
    };
    tentar();
    document.addEventListener("click", event => {
      const nav = event.target.closest?.('.nav-btn[data-page="rastreamento"]');
      if (nav) setTimeout(() => {
        injetarPainel();
        observarTabela();
        integrarBuscaExistente();
      }, 120);
    }, true);
    window.corponuConsultarHistoricoOP = consultarOP;
    console.info(`[Auditoria OP] Módulo carregado: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
