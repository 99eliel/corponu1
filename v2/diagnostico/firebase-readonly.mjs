import { normalizarOPLegada } from "../core/op-normalizador.mjs";
import { contratoOPV2Valido } from "../core/op-contrato.mjs";

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function resumoLeituras(leituras = {}) {
  return {
    getDoc: Math.max(0, Number(leituras.getDoc) || 0),
    getDocs: Math.max(0, Number(leituras.getDocs) || 0),
    documentos: Math.max(0, Number(leituras.documentos) || 0)
  };
}

async function executarEtapa({ id, titulo, medir, acao }) {
  try {
    const medido = await medir(id, acao);
    const resultado = medido?.resultado || {};
    return {
      id,
      titulo,
      nivel: resultado.nivel || "ok",
      mensagem: resultado.mensagem || "Conferência concluída.",
      detalhes: resultado.detalhes || [],
      leituras: resumoLeituras(medido?.leituras)
    };
  } catch (error) {
    return {
      id,
      titulo,
      nivel: "erro",
      mensagem: String(error?.message || error || "Falha desconhecida"),
      detalhes: [],
      leituras: resumoLeituras(error?.leituras)
    };
  }
}

function escolherOPParaSaldo(ordens = []) {
  return ordens.find(item => {
    const op = normalizarOPLegada(item);
    return contratoOPV2Valido(op).ok;
  }) || null;
}

export async function executarDiagnosticoFirebaseSomenteLeitura({
  contexto,
  medir = async (_id, acao) => ({ resultado: await acao(), leituras: {} }),
  limiteOrdens = 40,
  limitePrecos = 20,
  limitePagamentos = 20
} = {}) {
  if (!contexto?.db || !contexto?.fs || !contexto?.store) {
    throw new Error("CONTEXTO_FIREBASE_V2_INVALIDO");
  }

  const etapas = [];
  let ordensCarregadas = [];

  etapas.push(await executarEtapa({
    id: "ordens",
    titulo: "OPs reais + compatibilidade V2",
    medir,
    acao: async () => {
      ordensCarregadas = await contexto.carregarPrimeiraPaginaOrdens({ limitePagina: limiteOrdens });
      const normalizadas = ordensCarregadas.map(normalizarOPLegada);
      const invalidas = normalizadas
        .map((op, indice) => ({ op, indice, validacao: contratoOPV2Valido(op) }))
        .filter(item => !item.validacao.ok);

      return {
        nivel: invalidas.length ? "aviso" : "ok",
        mensagem: `${ordensCarregadas.length} OPs lidas; ${invalidas.length} incompatíveis com o contrato mínimo V2.`,
        detalhes: invalidas.slice(0, 5).map(item =>
          `OP ${item.op.numeroOP || item.op.id || `#${item.indice + 1}`}: ${item.validacao.erros.join(", ")}`
        )
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "faccoes",
    titulo: "Catálogo de facções",
    medir,
    acao: async () => {
      await contexto.garantirFaccoes();
      const quantidade = contexto.store.listar("faccoes").length;
      return {
        nivel: quantidade ? "ok" : "aviso",
        mensagem: `${quantidade} facções disponíveis no store compartilhado.`,
        detalhes: quantidade ? [] : ["A coleção foi acessada, mas nenhum cadastro de facção foi encontrado."]
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "movimentacoes",
    titulo: "Movimentações operacionais / Facções",
    medir,
    acao: async () => {
      const itens = await contexto.movimentacoesFaccoesRepo.carregarPrimeiraPagina();
      return {
        nivel: itens.length ? "ok" : "aviso",
        mensagem: `${itens.length} movimentações carregadas na primeira página.`,
        detalhes: itens.length ? [] : ["Nenhuma movimentação apareceu na primeira página; isso pode ser normal se a coleção estiver vazia."]
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "config-sutia",
    titulo: "Configuração financeira do Sutiã Completo",
    medir,
    acao: async () => {
      const config = await contexto.repositoriosFinanceiro.valoresRepo.buscarConfiguracaoSutiaCompleto();
      const erros = [];
      if (String(config.referenciaEspecial || "") !== "912") erros.push("A referência especial configurada não é 912.");
      if (numeroSeguro(config.valorBaseGeral) <= 0) erros.push("valorBaseGeral não está configurado com valor positivo.");
      if (numeroSeguro(config.valorBaseReferenciaEspecial) <= 0) erros.push("valorBaseReferenciaEspecial não está configurado com valor positivo.");
      return {
        nivel: erros.length ? "erro" : "ok",
        mensagem: erros.length ? "Configuração financeira incompatível com a regra V2." : "Configuração do Sutiã Completo acessível e coerente com a V2.",
        detalhes: erros
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "precos",
    titulo: "Tabela de preços real",
    medir,
    acao: async () => {
      const { fs, db } = contexto;
      const snapshot = await fs.getDocs(fs.query(
        fs.collection(db, "precosReferencia"),
        fs.limit(Math.max(1, Math.min(50, Number(limitePrecos) || 20)))
      ));
      const itens = (snapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
      const ativosComValor = itens.filter(item => item.ativo !== false && numeroSeguro(item.valor) > 0);
      const valorAlca = await contexto.repositoriosFinanceiro.valoresRepo.buscarValorUnitario("TODAS", "ALÇA");
      const detalhes = [];
      if (!ativosComValor.length) detalhes.push("Nenhum preço ativo e positivo apareceu na amostra lida.");
      if (numeroSeguro(valorAlca) <= 0) detalhes.push("O valor universal de ALÇA não foi encontrado em TODAS.");
      return {
        nivel: detalhes.length ? "erro" : "ok",
        mensagem: `${itens.length} preços amostrados; ALÇA universal ${numeroSeguro(valorAlca) > 0 ? "encontrada" : "não encontrada"}.`,
        detalhes
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "pagamentos",
    titulo: "Pagamentos / histórico financeiro",
    medir,
    acao: async () => {
      const itens = await contexto.pagamentosConsultaRepo.carregarPrimeiraPagina({ limitePagina: limitePagamentos });
      return {
        nivel: "ok",
        mensagem: `${itens.length} lançamentos financeiros carregados na primeira página.`,
        detalhes: itens.length ? [] : ["A leitura foi permitida, mas a primeira página não retornou lançamentos."]
      };
    }
  }));

  etapas.push(await executarEtapa({
    id: "saldo-fechamento",
    titulo: "Saldo do Fechamento",
    medir,
    acao: async () => {
      const ordemRaw = escolherOPParaSaldo(ordensCarregadas);
      if (!ordemRaw) {
        return {
          nivel: "aviso",
          mensagem: "Não havia OP válida na amostra para testar o saldo do Fechamento.",
          detalhes: []
        };
      }
      const op = normalizarOPLegada(ordemRaw);
      const processo = op.tipoPeca === "calcinha" ? "CALCINHA COMPLETA" : "SUTIÃ MONTAGEM";
      const saldo = await contexto.repositoriosFinanceiro.pagamentosRepo.obterSaldoProcesso({
        opId: op.id,
        numeroOP: op.numeroOP,
        processo,
        quantidadeOP: op.quantidade,
        forcar: true
      });
      return {
        nivel: "ok",
        mensagem: `OP ${op.numeroOP} · ${processo}: ${saldo.quantidadeFechada || 0} fechadas / ${saldo.quantidadeRestante || 0} restantes.`,
        detalhes: []
      };
    }
  }));

  const resumo = etapas.reduce((acc, etapa) => {
    acc[etapa.nivel] = (acc[etapa.nivel] || 0) + 1;
    acc.documentosLidos += etapa.leituras.documentos;
    acc.chamadas += etapa.leituras.getDoc + etapa.leituras.getDocs;
    return acc;
  }, { ok: 0, aviso: 0, erro: 0, documentosLidos: 0, chamadas: 0 });

  return {
    ok: resumo.erro === 0,
    geradoEm: new Date().toISOString(),
    resumo,
    etapas
  };
}
