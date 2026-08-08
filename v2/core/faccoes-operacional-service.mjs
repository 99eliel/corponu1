import {
  criarDadosReenvioOperacional,
  criarPatchAvisoChegada,
  criarPatchConfirmacaoChegada,
  quantidadeDisponivelReenvio
} from "./faccoes-operacional-regras.mjs";

function exigirMetodo(objeto, nome, grupo) {
  if (!objeto || typeof objeto[nome] !== "function") {
    throw new Error(`${grupo}.${nome} não foi configurado.`);
  }
}

export class FaccoesOperacionalService {
  constructor({ repo, auditoriaRepo = null }) {
    exigirMetodo(repo, "buscarMovimentacao", "faccoesRepo");
    exigirMetodo(repo, "transacionarMovimentacao", "faccoesRepo");
    exigirMetodo(repo, "transacionarReenvio", "faccoesRepo");
    this.repo = repo;
    this.auditoriaRepo = auditoriaRepo;
  }

  async carregar(id) {
    const movimentacao = await this.repo.buscarMovimentacao(id);
    return movimentacao
      ? { ok: true, erros: [], movimentacao }
      : { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"], movimentacao: null };
  }

  async informarChegada({ id, usuario = {}, dataHoje = "" }) {
    const resultado = await this.repo.transacionarMovimentacao(id, atual =>
      criarPatchAvisoChegada({ movimentacao: atual, usuario, dataHoje })
    );

    if (resultado?.ok) {
      this.#auditar({
        acao: "chegada_faccao_informada",
        alvoId: id,
        detalhes: `OP ${resultado.movimentacao?.numeroOP || "-"} | sem pagamento`,
        usuario
      });
    }
    return resultado;
  }

  async confirmarChegada({
    id,
    dataChegada,
    falta = 0,
    defeito = 0,
    componentes = {},
    usuario = {}
  }) {
    const resultado = await this.repo.transacionarMovimentacao(id, atual =>
      criarPatchConfirmacaoChegada({
        movimentacao: atual,
        dataChegada,
        falta,
        defeito,
        componentes,
        usuario
      })
    );

    if (resultado?.ok) {
      this.#auditar({
        acao: "chegada_faccao_confirmada_operacional",
        alvoId: id,
        detalhes: `OP ${resultado.movimentacao?.numeroOP || "-"} | recebida ${resultado.dados?.quantidadeRecebida || 0} | sem pagamento`,
        usuario
      });
    }
    return resultado;
  }

  async reenviar({
    id,
    processo,
    destino,
    destinoId = "",
    quantidade,
    dataEnvio,
    usuario = {}
  }) {
    const resultado = await this.repo.transacionarReenvio(
      id,
      atual => {
        const disponivel = quantidadeDisponivelReenvio(atual);
        if (Number(quantidade || 0) > disponivel) {
          return {
            ok: false,
            erros: ["QUANTIDADE_MAIOR_QUE_DISPONIVEL"],
            dadosMovimentacao: null,
            patchOrigem: null
          };
        }

        return criarDadosReenvioOperacional({
          movimentacao: atual,
          processo,
          destino,
          destinoId,
          quantidade,
          dataEnvio
        });
      },
      usuario
    );

    if (resultado?.ok) {
      this.#auditar({
        acao: "movimentacao_reenvio_criado",
        alvoId: resultado.novaMovimentacao?.id || id,
        detalhes: `OP ${resultado.novaMovimentacao?.numeroOP || "-"} | ${resultado.novaMovimentacao?.processo || "-"} | ${resultado.novaMovimentacao?.destino || "-"}`,
        usuario
      });
    }
    return resultado;
  }

  #auditar({ acao, alvoId, detalhes, usuario }) {
    if (!this.auditoriaRepo?.registrar) return;
    Promise.resolve(this.auditoriaRepo.registrar({
      acao,
      tipoAlvo: "movimentacaoProducao",
      alvoId,
      detalhes,
      usuario
    })).catch(() => {});
  }
}
