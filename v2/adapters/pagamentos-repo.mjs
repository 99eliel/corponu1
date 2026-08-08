import { normalizarCompetencia, texto } from "../core/normalizacao.mjs";

function exigirApi(fs, nomes) {
  nomes.forEach(nome => {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  });
}

function documento(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function ehLancamento(item) {
  return item?.tipoDocumento !== "controle_processo_v2";
}

function chaveOrdenacao(item = {}) {
  const data = texto(item.dataEntrega || item.dataChegada || item.competencia || item.dataPagamento);
  if (data) return data;
  const segundos = Number(item?.criadoEm?.seconds ?? item?.criadoEm?._seconds);
  if (Number.isFinite(segundos)) return String(segundos).padStart(16, "0");
  return texto(item.criadoEm);
}

function ordenarFinanceiro(itens = []) {
  return [...itens].sort((a, b) => chaveOrdenacao(b).localeCompare(chaveOrdenacao(a)));
}

function deduplicar(itens = []) {
  const mapa = new Map();
  itens.forEach(item => {
    if (!item?.id || !ehLancamento(item)) return;
    mapa.set(item.id, item);
  });
  return ordenarFinanceiro([...mapa.values()]);
}

function intervaloCompetencia(competencia) {
  const comp = normalizarCompetencia(competencia);
  if (!comp) return null;
  const [ano, mes] = comp.split("-").map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  return {
    competencia: comp,
    inicio: `${comp}-01`,
    fimExclusivo: `${proximoAno}-${String(proximoMes).padStart(2, "0")}-01`
  };
}

function limitarPagina(valor, padrao = 50) {
  return Math.max(1, Math.min(200, Number(valor) || padrao));
}

export function criarPagamentosConsultaRepoFirestore({ db, fs, colecao = "entregasPagamento" }) {
  exigirApi(fs, ["collection", "query", "where", "orderBy", "limit", "getDocs", "startAfter", "doc", "writeBatch", "serverTimestamp"]);
  if (colecao !== "entregasPagamento") throw new Error("Pagamentos V2 consulta somente entregasPagamento.");

  let filtrosAtuais = { competencia: "", limitePagina: 50 };
  let cursorGeral = null;
  let cursorV2 = null;
  let cursorHistorico = null;
  let acabouGeral = false;
  let acabouV2 = false;
  let acabouHistorico = false;

  function consultaGeral({ limitePagina, cursor = null } = {}) {
    const restricoes = [fs.orderBy("criadoEm", "desc")];
    if (cursor) restricoes.push(fs.startAfter(cursor));
    restricoes.push(fs.limit(limitarPagina(limitePagina)));
    return fs.query(fs.collection(db, colecao), ...restricoes);
  }

  function consultaV2({ competencia, limitePagina, cursor = null } = {}) {
    const restricoes = [fs.where("competencia", "==", normalizarCompetencia(competencia))];
    if (cursor) restricoes.push(fs.startAfter(cursor));
    restricoes.push(fs.limit(limitarPagina(limitePagina)));
    return fs.query(fs.collection(db, colecao), ...restricoes);
  }

  function consultaHistorica({ competencia, limitePagina, cursor = null } = {}) {
    const intervalo = intervaloCompetencia(competencia);
    if (!intervalo) throw new Error("COMPETENCIA_HISTORICA_INVALIDA");
    const restricoes = [
      fs.where("dataEntrega", ">=", intervalo.inicio),
      fs.where("dataEntrega", "<", intervalo.fimExclusivo),
      fs.orderBy("dataEntrega", "desc")
    ];
    if (cursor) restricoes.push(fs.startAfter(cursor));
    restricoes.push(fs.limit(limitarPagina(limitePagina)));
    return fs.query(fs.collection(db, colecao), ...restricoes);
  }

  async function carregarConsulta(consulta, tamanho) {
    if (tamanho <= 0) return { itens: [], cursor: null, acabou: true, quantidadeDocumentos: 0 };
    const snapshot = await fs.getDocs(consulta);
    const docs = snapshot.docs || [];
    return {
      itens: docs.map(documento).filter(ehLancamento),
      cursor: docs.at(-1) || null,
      acabou: docs.length < tamanho,
      quantidadeDocumentos: docs.length
    };
  }

  async function carregarPaginaGeral({ limitePagina, cursor = null } = {}) {
    const tamanho = limitarPagina(limitePagina);
    return carregarConsulta(consultaGeral({ limitePagina: tamanho, cursor }), tamanho);
  }

  async function carregarPaginaMensal({ competencia, limitePagina, cursorNovo = null, cursorAntigo = null, novoAcabou = false, antigoAcabou = false } = {}) {
    const tamanho = Math.max(2, limitarPagina(limitePagina));
    let limiteV2 = novoAcabou ? 0 : Math.ceil(tamanho / 2);
    let limiteHistorico = antigoAcabou ? 0 : Math.floor(tamanho / 2);

    if (novoAcabou && !antigoAcabou) limiteHistorico = tamanho;
    if (antigoAcabou && !novoAcabou) limiteV2 = tamanho;

    const [v2, historico] = await Promise.all([
      limiteV2
        ? carregarConsulta(consultaV2({ competencia, limitePagina: limiteV2, cursor: cursorNovo }), limiteV2)
        : Promise.resolve({ itens: [], cursor: cursorNovo, acabou: true, quantidadeDocumentos: 0 }),
      limiteHistorico
        ? carregarConsulta(consultaHistorica({ competencia, limitePagina: limiteHistorico, cursor: cursorAntigo }), limiteHistorico)
        : Promise.resolve({ itens: [], cursor: cursorAntigo, acabou: true, quantidadeDocumentos: 0 })
    ]);

    return {
      itens: deduplicar([...v2.itens, ...historico.itens]),
      cursorV2: v2.cursor || cursorNovo,
      cursorHistorico: historico.cursor || cursorAntigo,
      acabouV2: novoAcabou || v2.acabou,
      acabouHistorico: antigoAcabou || historico.acabou,
      quantidadeDocumentos: v2.quantidadeDocumentos + historico.quantidadeDocumentos
    };
  }

  async function buscarTodosGeral({ limitePagina = 200, maximo = 10000 } = {}) {
    const itens = [];
    let cursor = null;
    let acabou = false;
    let lidos = 0;
    while (!acabou && lidos < maximo) {
      const pagina = await carregarPaginaGeral({ limitePagina, cursor });
      itens.push(...pagina.itens);
      cursor = pagina.cursor;
      lidos += pagina.quantidadeDocumentos;
      acabou = pagina.acabou || !cursor;
    }
    if (!acabou && lidos >= maximo) throw new Error("LIMITE_SEGURANCA_PAGAMENTOS_ATINGIDO");
    return deduplicar(itens);
  }

  async function buscarTodosMensal({ competencia, limitePagina = 200, maximo = 10000 } = {}) {
    const itens = [];
    let novoCursor = null;
    let antigoCursor = null;
    let novoAcabou = false;
    let antigoAcabou = false;
    let lidos = 0;

    while (!(novoAcabou && antigoAcabou) && lidos < maximo) {
      const pagina = await carregarPaginaMensal({
        competencia,
        limitePagina,
        cursorNovo: novoCursor,
        cursorAntigo: antigoCursor,
        novoAcabou,
        antigoAcabou
      });
      itens.push(...pagina.itens);
      novoCursor = pagina.cursorV2;
      antigoCursor = pagina.cursorHistorico;
      novoAcabou = pagina.acabouV2;
      antigoAcabou = pagina.acabouHistorico;
      lidos += pagina.quantidadeDocumentos;
      if (pagina.quantidadeDocumentos === 0) break;
    }

    if (!(novoAcabou && antigoAcabou) && lidos >= maximo) {
      throw new Error("LIMITE_SEGURANCA_PAGAMENTOS_ATINGIDO");
    }
    return deduplicar(itens);
  }

  return {
    async carregarPrimeiraPagina({ competencia = "", limitePagina = 50 } = {}) {
      filtrosAtuais = { competencia: normalizarCompetencia(competencia), limitePagina: limitarPagina(limitePagina) };
      cursorGeral = null;
      cursorV2 = null;
      cursorHistorico = null;
      acabouGeral = false;
      acabouV2 = false;
      acabouHistorico = false;

      if (!filtrosAtuais.competencia) {
        const resultado = await carregarPaginaGeral(filtrosAtuais);
        cursorGeral = resultado.cursor;
        acabouGeral = resultado.acabou;
        return deduplicar(resultado.itens);
      }

      const resultado = await carregarPaginaMensal({
        ...filtrosAtuais,
        cursorNovo: null,
        cursorAntigo: null
      });
      cursorV2 = resultado.cursorV2;
      cursorHistorico = resultado.cursorHistorico;
      acabouV2 = resultado.acabouV2;
      acabouHistorico = resultado.acabouHistorico;
      return resultado.itens;
    },

    async carregarMais() {
      if (!filtrosAtuais.competencia) {
        if (acabouGeral) return [];
        const resultado = await carregarPaginaGeral({ ...filtrosAtuais, cursor: cursorGeral });
        cursorGeral = resultado.cursor;
        acabouGeral = resultado.acabou;
        return deduplicar(resultado.itens);
      }

      if (acabouV2 && acabouHistorico) return [];
      const resultado = await carregarPaginaMensal({
        ...filtrosAtuais,
        cursorNovo: cursorV2,
        cursorAntigo: cursorHistorico,
        novoAcabou: acabouV2,
        antigoAcabou: acabouHistorico
      });
      cursorV2 = resultado.cursorV2;
      cursorHistorico = resultado.cursorHistorico;
      acabouV2 = resultado.acabouV2;
      acabouHistorico = resultado.acabouHistorico;
      return resultado.itens;
    },

    acabou() {
      return filtrosAtuais.competencia ? (acabouV2 && acabouHistorico) : acabouGeral;
    },

    async buscarTodos({ competencia = "", limitePagina = 200, maximo = 10000 } = {}) {
      const comp = normalizarCompetencia(competencia);
      return comp
        ? buscarTodosMensal({ competencia: comp, limitePagina, maximo })
        : buscarTodosGeral({ limitePagina, maximo });
    },

    async quitarEmLote(ids = [], { usuario = null } = {}) {
      const unicos = [...new Set((ids || []).map(texto).filter(Boolean))];
      if (!unicos.length) return { ok: false, erros: ["NENHUM_PAGAMENTO_PENDENTE"], ids: [] };
      const agora = fs.serverTimestamp();
      for (let inicio = 0; inicio < unicos.length; inicio += 400) {
        const lote = unicos.slice(inicio, inicio + 400);
        const batch = fs.writeBatch(db);
        lote.forEach(id => batch.update(fs.doc(db, colecao, id), {
          statusPagamento: "pago",
          pagoEm: agora,
          pagoPor: texto(usuario?.uid || usuario?.id),
          pagoPorNome: texto(usuario?.nome || usuario?.displayName || usuario?.email),
          atualizadoEm: agora
        }));
        await batch.commit();
      }
      return { ok: true, erros: [], ids: unicos };
    }
  };
}
