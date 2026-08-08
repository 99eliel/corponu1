import {
  TIPO_CALCINHA,
  analisarDuplicidadeOrdem,
  criarDadosOrdem,
  criarIdNovaOrdem,
  tipoPecaCanonico,
  validarEntradaOrdem
} from "./ordens-regras.mjs";
import { texto } from "./normalizacao.mjs";

function exigirMetodo(objeto, nome, grupo) {
  if (!objeto || typeof objeto[nome] !== "function") {
    throw new Error(`${grupo}.${nome} não foi configurado.`);
  }
}

export class OrdensService {
  constructor({ produtosRepo, ordensRepo, auditoriaRepo = null }) {
    exigirMetodo(produtosRepo, "buscarPorReferencia", "produtosRepo");
    exigirMetodo(ordensRepo, "buscarTodosPorNumero", "ordensRepo");
    exigirMetodo(ordensRepo, "buscarPorId", "ordensRepo");
    exigirMetodo(ordensRepo, "salvar", "ordensRepo");

    this.produtosRepo = produtosRepo;
    this.ordensRepo = ordensRepo;
    this.auditoriaRepo = auditoriaRepo;
  }

  async prepararSalvamento({
    entrada,
    currentId = "",
    permitirConversaoTipo = false
  } = {}) {
    const validacao = validarEntradaOrdem(entrada);
    if (!validacao.ok) {
      return { ok: false, erros: validacao.erros, requerConfirmacaoConversao: false };
    }

    const tipoPeca = validacao.dados.tipoPeca;
    const [produto, encontradas] = await Promise.all([
      this.produtosRepo.buscarPorReferencia(validacao.dados.referencia, tipoPeca),
      this.ordensRepo.buscarTodosPorNumero(validacao.dados.numeroOP)
    ]);

    if (!produto) {
      return {
        ok: false,
        erros: [tipoPeca === TIPO_CALCINHA ? "PRODUTO_CALCINHA_NAO_ENCONTRADO" : "PRODUTO_SUTIA_NAO_ENCONTRADO"],
        requerConfirmacaoConversao: false
      };
    }

    const duplicidade = analisarDuplicidadeOrdem({
      tipoPeca,
      currentId,
      encontradas
    });

    let alvoId = texto(currentId);
    let anterior = null;
    let convertendoTipo = false;

    if (!duplicidade.ok) {
      if (duplicidade.acao === "PODE_CORRIGIR_TIPO") {
        if (!permitirConversaoTipo) {
          return {
            ok: false,
            erros: duplicidade.erros,
            requerConfirmacaoConversao: true,
            conflito: duplicidade.conflito
          };
        }
        alvoId = duplicidade.conflito.id;
        anterior = duplicidade.conflito;
        convertendoTipo = true;
      } else {
        return {
          ok: false,
          erros: duplicidade.erros,
          requerConfirmacaoConversao: false,
          conflito: duplicidade.conflito
        };
      }
    }

    if (alvoId && !anterior) {
      anterior = encontradas.find(item => String(item.id) === String(alvoId)) ||
        await this.ordensRepo.buscarPorId(alvoId);
      if (!anterior && currentId) {
        return { ok: false, erros: ["ORDEM_EDICAO_NAO_ENCONTRADA"], requerConfirmacaoConversao: false };
      }
    }

    const nova = !alvoId;
    if (nova) alvoId = criarIdNovaOrdem(validacao.dados.numeroOP, tipoPeca);

    const criacao = criarDadosOrdem({
      entrada: { ...entrada, tipoPeca },
      produto,
      anterior: anterior || {}
    });

    if (!criacao.ok) {
      return { ok: false, erros: criacao.erros, requerConfirmacaoConversao: false };
    }

    return {
      ok: true,
      erros: [],
      requerConfirmacaoConversao: false,
      id: alvoId,
      novo: nova,
      convertendoTipo,
      anterior,
      produto,
      dados: criacao.dados
    };
  }

  async salvar({
    entrada,
    currentId = "",
    permitirConversaoTipo = false,
    usuario = null
  } = {}) {
    const preparado = await this.prepararSalvamento({
      entrada,
      currentId,
      permitirConversaoTipo
    });

    if (!preparado.ok) return preparado;

    const salvo = await this.ordensRepo.salvar({
      id: preparado.id,
      dados: preparado.dados,
      usuario,
      novo: preparado.novo
    });

    if (this.auditoriaRepo?.registrar) {
      Promise.resolve(this.auditoriaRepo.registrar({
        acao: preparado.novo ? "ordem_criada" : preparado.convertendoTipo ? "ordem_tipo_corrigido" : "ordem_atualizada",
        tipoAlvo: "ordemProducao",
        alvoId: preparado.id,
        detalhes: `${preparado.dados.tipoPecaLabel} | OP ${preparado.dados.numeroOP} | Ref. ${preparado.dados.referencia} | Cor ${preparado.dados.cor} | Qtd. ${preparado.dados.quantidade}`,
        usuario
      })).catch(() => {});
    }

    return {
      ...preparado,
      salvo
    };
  }
}
