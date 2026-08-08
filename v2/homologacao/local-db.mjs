import { normalizar, normalizarReferencia, processoCanonico, texto } from "../core/normalizacao.mjs";
import { criarChaveLancamento, validarSaldoProcesso } from "../core/financeiro-regras.mjs";
import {
  CONFIG_SUTIA_COMPLETO_REAL_HOMOLOGACAO,
  VALORES_REAIS_HOMOLOGACAO
} from "./valores-reais.mjs";

const STORAGE_KEY = "corponu-flow-v2-homologacao-local";

function copiar(valor) {
  return valor == null ? valor : JSON.parse(JSON.stringify(valor));
}

function idNovo(prefixo) {
  if (globalThis.crypto?.randomUUID) return `${prefixo}-${crypto.randomUUID()}`;
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function dadosIniciaisHomologacao() {
  return {
    produtos: [
      { id: "prod-sutia-411", referencia: "411", nome: "Sutiã teste 411", tipoPeca: "sutia", tipoPecaLabel: "Sutiã", ativo: true },
      { id: "prod-sutia-912", referencia: "912", nome: "Sutiã especial 912", tipoPeca: "sutia", tipoPecaLabel: "Sutiã", ativo: true },
      { id: "prod-calcinha-610", referencia: "610", nome: "Calcinha teste 610", tipoPeca: "calcinha", tipoPecaLabel: "Calcinha", ativo: true }
    ],
    ordens: [
      { id: "op-sutia-70001", numeroOP: "70001", referencia: "411", cor: "PRETO", quantidade: 500, tipoPeca: "sutia", tipoPecaLabel: "Sutiã", necessidade: "URGENTE", necessidadeTexto: "URGENTE" },
      { id: "op-sutia-70002", numeroOP: "70002", referencia: "912", cor: "CHOCOLATE", quantidade: 300, tipoPeca: "sutia", tipoPecaLabel: "Sutiã", necessidade: "", necessidadeTexto: "" },
      { id: "op-calcinha-80001", numeroOP: "80001", referencia: "610", cor: "BRANCO", quantidade: 420, tipoPeca: "calcinha", tipoPecaLabel: "Calcinha", processoPlanejado: "CALCINHA COMPLETA", faccaoPlanejada: "LORENA" }
    ],
    faccoes: [
      { id: "f-danubia", nome: "DANUBIA", ativo: true, processosPermitidos: ["SUTIÃ COMPLETO"] },
      { id: "f-livia", nome: "LIVIA", ativo: true, processosPermitidos: ["SUTIÃ MONTAGEM"] },
      { id: "f-divina", nome: "DIVINA", ativo: true, processosPermitidos: ["ENCAPAR BOJO"] },
      { id: "f-janaina", nome: "JANAINA", ativo: true, processosPermitidos: ["ALÇA"] },
      { id: "f-lorena", nome: "LORENA", ativo: true, processosPermitidos: ["CALCINHA COMPLETA"] },
      { id: "f-ana-flavia", nome: "ANA FLAVIA", ativo: true, processosPermitidos: ["CALCINHA MONTAGEM"] }
    ],
    celulas: [
      { id: "cel-a", nome: "CÉLULA A", ativo: true },
      { id: "cel-b", nome: "CÉLULA B", ativo: true }
    ],
    movimentacoes: [
      {
        id: "mov-sutia-1",
        origem: "manejo",
        opId: "op-sutia-70001",
        numeroOP: "70001",
        referencia: "411",
        cor: "PRETO",
        produtoNome: "Sutiã teste 411",
        tipoDestino: "faccao",
        tipoDestinoLabel: "Facção",
        destino: "DANUBIA",
        destinoId: "f-danubia",
        processo: "SUTIÃ COMPLETO",
        setor: "sutia",
        setorLabel: "Sutiã",
        quantidadeEnviada: 500,
        dataEnvio: "2026-08-01",
        dataChegada: "",
        falta: 0,
        defeito: 0,
        quantidadeRecebida: 0,
        status: "em_andamento",
        criadoEm: "2026-08-01T09:00:00-03:00"
      },
      {
        id: "mov-calcinha-1",
        origem: "manejo",
        opId: "op-calcinha-80001",
        numeroOP: "80001",
        referencia: "610",
        cor: "BRANCO",
        produtoNome: "Calcinha teste 610",
        tipoDestino: "faccao",
        tipoDestinoLabel: "Facção",
        destino: "LORENA",
        destinoId: "f-lorena",
        processo: "CALCINHA COMPLETA",
        setor: "calcinha",
        setorLabel: "Calcinha",
        quantidadeEnviada: 420,
        dataEnvio: "2026-08-02",
        dataChegada: "",
        falta: 0,
        defeito: 0,
        quantidadeRecebida: 0,
        status: "em_andamento",
        criadoEm: "2026-08-02T10:00:00-03:00"
      }
    ],
    precos: VALORES_REAIS_HOMOLOGACAO.map((item, indice) => ({ id: `valor-real-${indice + 1}`, ...item })),
    pagamentos: [],
    usuarios: []
  };
}

export function carregarDadosLocais() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return salvo && typeof salvo === "object" ? salvo : dadosIniciaisHomologacao();
  } catch {
    return dadosIniciaisHomologacao();
  }
}

export function instalarPersistenciaLocal(store) {
  const salvar = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(store.snapshot()));
  const paradas = ["produtos", "ordens", "faccoes", "celulas", "movimentacoes", "precos", "pagamentos", "usuarios"]
    .map(dominio => store.assinar(dominio, salvar));
  salvar();
  return () => paradas.forEach(parar => parar());
}

export function restaurarDadosLocais() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hidratarStoreLocal(store, dados = carregarDadosLocais()) {
  for (const dominio of ["produtos", "ordens", "faccoes", "celulas", "movimentacoes", "precos", "pagamentos", "usuarios"]) {
    store.substituir(dominio, Array.isArray(dados[dominio]) ? dados[dominio] : []);
  }
  return store;
}

export function criarRepositoriosLocais(store) {
  const produtosRepo = {
    async buscarPorReferencia(referencia, tipoPeca = "") {
      return store.buscarProdutoPorReferencia(referencia, tipoPeca);
    }
  };

  const ordensRepo = {
    async buscarTodosPorNumero(numeroOP) {
      const alvo = normalizar(numeroOP);
      return store.listar("ordens").filter(item => normalizar(item.numeroOP || item.numeroOPExterno || item.op || item.id) === alvo);
    },
    async buscarPorId(id) {
      return store.obter("ordens", id);
    },
    async salvar({ id, dados }) {
      const salvo = { ...(store.obter("ordens", id) || {}), ...copiar(dados), id };
      store.upsert("ordens", salvo);
      return copiar(salvo);
    }
  };

  const manejoRepo = {
    async buscarOrdem(id) {
      return store.obter("ordens", id);
    },
    async salvarManejo({ ordem, setor, manejo, status = "organizada" }) {
      const local = {
        ...ordem,
        necessidade: texto(manejo.necessidade),
        necessidadeTexto: texto(manejo.necessidade),
        necessidadeManual: true,
        manejosSetores: { ...(ordem.manejosSetores || {}), [setor]: copiar(manejo) },
        manejoStatusSetores: { ...(ordem.manejoStatusSetores || {}), [setor]: status }
      };
      store.upsert("ordens", local);
      return { ordem: copiar(local), manejo: copiar(manejo) };
    },
    async criarMovimentacaoComManejo({ ordem, setor, manejo, movimentacao, movimentacaoOrigemId = "" }) {
      const ordemLocal = {
        ...ordem,
        necessidade: texto(manejo.necessidade),
        necessidadeTexto: texto(manejo.necessidade),
        necessidadeManual: true,
        manejosSetores: { ...(ordem.manejosSetores || {}), [setor]: copiar(manejo) },
        manejoStatusSetores: { ...(ordem.manejoStatusSetores || {}), [setor]: "organizada" }
      };
      const movLocal = { id: idNovo("mov"), ...copiar(movimentacao), criadoEm: new Date().toISOString() };
      store.upsert("ordens", ordemLocal);
      store.upsert("movimentacoes", movLocal);
      if (texto(movimentacaoOrigemId)) {
        const origem = store.obter("movimentacoes", movimentacaoOrigemId);
        if (origem) store.upsert("movimentacoes", { ...origem, status: "encaminhado", encaminhado: true, encaminhadoMovimentacaoId: movLocal.id });
      }
      return { ordem: copiar(ordemLocal), manejo: copiar(manejo), movimentacao: copiar(movLocal) };
    }
  };

  const faccoesOperacionalRepo = {
    async buscarMovimentacao(id) {
      return store.obter("movimentacoes", id);
    },
    async transacionarMovimentacao(id, resolver) {
      const atual = store.obter("movimentacoes", id);
      if (!atual) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
      const resolvido = await resolver(copiar(atual));
      if (!resolvido?.ok || !resolvido.patch) return resolvido;
      const movimento = {
        ...atual,
        ...copiar(resolvido.patch),
        componentesConsolidados: resolvido.patch.componentesConsolidados
          ? { ...(atual.componentesConsolidados || {}), ...copiar(resolvido.patch.componentesConsolidados) }
          : atual.componentesConsolidados
      };
      store.upsert("movimentacoes", movimento);
      if (resolvido.patch.componentesConsolidados && movimento.opId) {
        const ordem = store.obter("ordens", movimento.opId);
        if (ordem) store.upsert("ordens", {
          ...ordem,
          componentesConsolidados: { ...(ordem.componentesConsolidados || {}), ...copiar(resolvido.patch.componentesConsolidados) }
        });
      }
      return { ...resolvido, movimentacao: copiar(movimento) };
    },
    async transacionarReenvio(id, resolver) {
      const origem = store.obter("movimentacoes", id);
      if (!origem) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
      const resolvido = await resolver(copiar(origem));
      if (!resolvido?.ok || !resolvido.dadosMovimentacao || !resolvido.patchOrigem) return resolvido;
      const nova = { id: idNovo("mov"), ...copiar(resolvido.dadosMovimentacao), criadoEm: new Date().toISOString() };
      const origemAtualizada = { ...origem, ...copiar(resolvido.patchOrigem), reenvioCriadoId: nova.id };
      store.upsert("movimentacoes", origemAtualizada);
      store.upsert("movimentacoes", nova);
      return { ...resolvido, movimentacaoOrigem: copiar(origemAtualizada), novaMovimentacao: copiar(nova) };
    }
  };

  const movimentosRepo = {
    async carregarPrimeiraPagina() { return store.listar("movimentacoes"); },
    async carregarMais() { return []; },
    acabou() { return true; },
    listarCarregadas() {
      return store.listar("movimentacoes").filter(item => normalizar(item.tipoDestino) === "FACCAO");
    }
  };

  function buscarValorLocal(referencia, processo, { permitirUniversal = true } = {}) {
    const ref = normalizarReferencia(referencia);
    const proc = processoCanonico(processo);
    const precos = store.listar("precos").filter(item => item.ativo !== false && processoCanonico(item.processo) === proc);
    const exato = precos.find(item => normalizarReferencia(item.referencia) === ref);
    if (exato) return Number(exato.valor || 0);
    if (!permitirUniversal) return 0;
    const universal = precos.find(item => normalizarReferencia(item.referencia) === "TODAS");
    return Number(universal?.valor || 0);
  }

  const valoresRepo = {
    async buscarValorUnitario(referencia, processo) {
      return buscarValorLocal(referencia, processo, { permitirUniversal: true });
    },
    async buscarConfiguracaoSutiaCompleto() {
      return { ...CONFIG_SUTIA_COMPLETO_REAL_HOMOLOGACAO };
    },
    async buscarValoresComponentes(referencia) {
      return {
        lateral: buscarValorLocal(referencia, "LATERAL", { permitirUniversal: false }),
        bojo: buscarValorLocal(referencia, "ENCAPAR BOJO", { permitirUniversal: false })
      };
    }
  };

  function lancamentosProcesso({ opId, numeroOP, processo }) {
    const alvoProcesso = processoCanonico(processo);
    const alvoNumero = normalizar(numeroOP);
    return store.listar("pagamentos").filter(item => {
      if (item.tipoDocumento === "controle_processo_v2" || item.estornado === true || item.excluido === true) return false;
      const mesmaOP = texto(opId) ? texto(item.opId) === texto(opId) : normalizar(item.numeroOP) === alvoNumero;
      return mesmaOP && processoCanonico(item.processo) === alvoProcesso;
    });
  }

  const pagamentosRepo = {
    async obterSaldoProcesso({ opId, numeroOP, processo, quantidadeOP }) {
      const itens = lancamentosProcesso({ opId, numeroOP, processo });
      const quantidadeFechada = itens.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
      return {
        quantidadeOP: Number(quantidadeOP || 0),
        quantidadeFechada,
        quantidadeRestante: Math.max(Number(quantidadeOP || 0) - quantidadeFechada, 0),
        quantidadeLancamentos: itens.length
      };
    },

    async salvarComSaldo(documento, { saldoInicial = null } = {}) {
      const saldoAtual = await this.obterSaldoProcesso(documento);
      const base = saldoAtual.quantidadeLancamentos || saldoInicial?.quantidadeLancamentos || 0;
      const validacao = validarSaldoProcesso({
        quantidadeOP: documento.quantidadeOP,
        quantidadeFechada: saldoAtual.quantidadeFechada,
        quantidadeNova: documento.quantidade
      });
      if (!validacao.ok) return { ok: false, motivo: validacao.erros[0], saldo: validacao };

      const parcela = base + 1;
      const id = criarChaveLancamento({
        opId: documento.opId,
        numeroOP: documento.numeroOP,
        processo: documento.processo,
        parcela
      });
      const existente = store.obter("pagamentos", id);
      if (existente) return { ok: false, motivo: "LANCAMENTO_DUPLICADO", existente, saldo: validacao };

      const salvo = {
        id,
        ...copiar(documento),
        chaveFechamento: id,
        parcela,
        quantidadeFechadaProcesso: validacao.quantidadeFechadaDepois,
        quantidadeRestanteProcesso: validacao.quantidadeRestanteDepois,
        criadoEm: new Date().toISOString()
      };
      store.upsert("pagamentos", salvo);
      return {
        ok: true,
        documento: copiar(salvo),
        saldo: {
          ...validacao,
          quantidadeFechada: validacao.quantidadeFechadaDepois,
          quantidadeRestante: validacao.quantidadeRestanteDepois,
          quantidadeLancamentos: parcela
        }
      };
    }
  };

  return { produtosRepo, ordensRepo, manejoRepo, faccoesOperacionalRepo, movimentosRepo, valoresRepo, pagamentosRepo };
}
