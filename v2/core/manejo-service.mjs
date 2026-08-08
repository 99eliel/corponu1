import {
  criarDadosManejo,
  criarDadosMovimentacao,
  getManejoDaOrdemV2,
  validarMovimentacaoManejo
} from "./manejo-regras.mjs";

function exigirMetodo(objeto, nome, grupo) {
  if (!objeto || typeof objeto[nome] !== "function") {
    throw new Error(`${grupo}.${nome} não foi configurado.`);
  }
}

export class ManejoService {
  constructor({ manejoRepo, auditoriaRepo = null }) {
    exigirMetodo(manejoRepo, "buscarOrdem", "manejoRepo");
    exigirMetodo(manejoRepo, "salvarManejo", "manejoRepo");
    exigirMetodo(manejoRepo, "criarMovimentacaoComManejo", "manejoRepo");
    this.manejoRepo = manejoRepo;
    this.auditoriaRepo = auditoriaRepo;
  }

  async carregarOrdem(ordemId) {
    const ordem = await this.manejoRepo.buscarOrdem(ordemId);
    return ordem
      ? { ok: true, erros: [], ordem }
      : { ok: false, erros: ["OP_NAO_ENCONTRADA"], ordem: null };
  }

  async prepararManejo({ ordem, ordemId, setor, entrada }) {
    const ordemFinal = ordem || await this.manejoRepo.buscarOrdem(ordemId);
    if (!ordemFinal) return { ok: false, erros: ["OP_NAO_ENCONTRADA"], ordem: null };

    const anterior = getManejoDaOrdemV2(ordemFinal, setor) || {};
    const criacao = criarDadosManejo({ ordem: ordemFinal, setor, entrada, anterior });
    return {
      ...criacao,
      ordem: ordemFinal,
      anterior
    };
  }

  async salvarManejo({ ordem, ordemId, setor, entrada, usuario = null }) {
    const preparado = await this.prepararManejo({ ordem, ordemId, setor, entrada });
    if (!preparado.ok) return preparado;

    const salvo = await this.manejoRepo.salvarManejo({
      ordem: preparado.ordem,
      setor,
      manejo: preparado.dados,
      usuario,
      status: preparado.dados.status === "bipado" ? "bipado" : "organizada"
    });

    this.#auditar({
      acao: preparado.anterior && Object.keys(preparado.anterior).length ? "manejo_atualizado" : "manejo_criado",
      alvoId: preparado.ordem.id,
      detalhes: `OP ${preparado.ordem.numeroOP || ""} | Setor ${setor} | Fase ${preparado.dados.fase}`,
      usuario
    });

    return { ...preparado, salvo };
  }

  async prepararMovimentacao({
    ordem,
    ordemId,
    setor,
    entradaManejo,
    tipoDestino,
    destino,
    destinoId = "",
    processo,
    quantidade,
    quantidadeMaxima = 0,
    dataEnvio,
    origem = "manejo",
    movimentacaoOrigemId = ""
  }) {
    const preparadoManejo = await this.prepararManejo({
      ordem,
      ordemId,
      setor,
      entrada: entradaManejo
    });
    if (!preparadoManejo.ok) return { ...preparadoManejo, movimentacao: null };

    const validacao = validarMovimentacaoManejo({
      ordem: preparadoManejo.ordem,
      setor,
      manejo: preparadoManejo.dados,
      tipoDestino,
      destino,
      processo,
      quantidade,
      quantidadeMaxima,
      dataEnvio
    });

    if (!validacao.ok) {
      return {
        ok: false,
        erros: validacao.erros,
        ordem: preparadoManejo.ordem,
        manejo: preparadoManejo.dados,
        movimentacao: null
      };
    }

    const movimento = criarDadosMovimentacao({
      ordem: preparadoManejo.ordem,
      validacao,
      origem,
      movimentacaoOrigemId,
      destinoId
    });

    return {
      ok: movimento.ok,
      erros: movimento.erros,
      ordem: preparadoManejo.ordem,
      manejo: preparadoManejo.dados,
      movimentacao: movimento.dados,
      movimentacaoOrigemId
    };
  }

  async movimentar(entrada) {
    const preparado = await this.prepararMovimentacao(entrada);
    if (!preparado.ok) return preparado;

    const salvo = await this.manejoRepo.criarMovimentacaoComManejo({
      ordem: preparado.ordem,
      setor: entrada.setor,
      manejo: preparado.manejo,
      movimentacao: preparado.movimentacao,
      usuario: entrada.usuario || null,
      movimentacaoOrigemId: preparado.movimentacaoOrigemId
    });

    this.#auditar({
      acao: preparado.movimentacao.reenvio ? "movimentacao_reenvio_criado" : "movimentacao_criada",
      alvoId: salvo.movimentacao.id,
      detalhes: `OP ${preparado.movimentacao.numeroOP} | ${preparado.movimentacao.tipoDestinoLabel} ${preparado.movimentacao.destino} | ${preparado.movimentacao.processo} | ${preparado.movimentacao.quantidadeEnviada} peças`,
      usuario: entrada.usuario || null
    });

    return { ...preparado, salvo };
  }

  #auditar({ acao, alvoId, detalhes, usuario }) {
    if (!this.auditoriaRepo?.registrar) return;
    Promise.resolve(this.auditoriaRepo.registrar({
      acao,
      tipoAlvo: acao.startsWith("movimentacao") ? "movimentacaoProducao" : "ordemProducao",
      alvoId,
      detalhes,
      usuario
    })).catch(() => {});
  }
}
