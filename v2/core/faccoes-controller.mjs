import { listarFaccoesPorProcesso } from "./faccoes-regras.mjs";
import { componentesFaltantesOperacionais, componentesParaPatch } from "./componentes-operacionais.mjs";
import { validarRespostasComponentes } from "./componentes-confirmacao.mjs";
import { movimentacaoFaccaoAtiva, podeInformarChegada } from "./faccoes-operacional-regras.mjs";
import { normalizar, processoCanonico, texto } from "./normalizacao.mjs";

function ehSutiaCompleto(mov) {
  return processoCanonico(mov?.processo) === "SUTIÃ COMPLETO";
}

function ordenarMovimentos(a, b) {
  const dataA = String(a?.criadoEm?.seconds ?? a?.criadoEm ?? a?.dataEnvio ?? "");
  const dataB = String(b?.criadoEm?.seconds ?? b?.criadoEm ?? b?.dataEnvio ?? "");
  return dataB.localeCompare(dataA, "pt-BR", { numeric: true });
}

export class FaccoesController {
  constructor({
    store,
    movimentosRepo,
    operacionalService,
    fallbackFaccoesPorProcesso = {},
    referenciaEspecial = "912"
  }) {
    if (!store) throw new Error("Store V2 não configurado.");
    if (!movimentosRepo) throw new Error("Repositório paginado de Facções não configurado.");
    if (!operacionalService) throw new Error("Serviço operacional de Facções não configurado.");

    this.store = store;
    this.movimentosRepo = movimentosRepo;
    this.operacionalService = operacionalService;
    this.fallbackFaccoesPorProcesso = fallbackFaccoesPorProcesso;
    this.referenciaEspecial = referenciaEspecial;
  }

  carregarInicial() {
    return this.movimentosRepo.carregarPrimeiraPagina();
  }

  carregarMais() {
    return this.movimentosRepo.carregarMais();
  }

  acabou() {
    return this.movimentosRepo.acabou();
  }

  listar({ busca = "", processo = "", destino = "", status = "" } = {}) {
    const termo = normalizar(busca);
    const processoAlvo = processoCanonico(processo);
    const destinoAlvo = normalizar(destino);
    const statusAlvo = normalizar(status);

    return this.movimentosRepo.listarCarregadas()
      .filter(movimentacaoFaccaoAtiva)
      .filter(mov => {
        if (processoAlvo && processoCanonico(mov.processo) !== processoAlvo) return false;
        if (destinoAlvo && normalizar(mov.destino) !== destinoAlvo) return false;
        if (statusAlvo && normalizar(this.statusChegada(mov).chave) !== statusAlvo) return false;
        if (!termo) return true;
        return normalizar([
          mov.numeroOP,
          mov.referencia,
          mov.cor,
          mov.destino,
          mov.processo,
          mov.dataEnvio,
          mov.dataChegada,
          mov.chegadaInformadaPorNome
        ].join(" ")).includes(termo);
      })
      .sort(ordenarMovimentos);
  }

  obter(id) {
    return this.store.obter("movimentacoes", id);
  }

  statusChegada(mov) {
    if (texto(mov?.reenvioCriadoId) || mov?.reenviadoOperacionalmente === true) {
      return { chave: "reenviado", rotulo: "Reenviado" };
    }
    if (texto(mov?.dataChegada)) {
      return { chave: "confirmada", rotulo: `Chegada confirmada • ${texto(mov.dataChegada)}` };
    }
    if (mov?.chegadaInformada === true) {
      const por = texto(mov.chegadaInformadaPorNome) || "usuário";
      const data = texto(mov.chegadaInformadaData);
      return {
        chave: "avisada",
        rotulo: `Chegada avisada por ${por}${data ? ` • ${data}` : ""}`
      };
    }
    return { chave: "andamento", rotulo: "Em andamento" };
  }

  acaoChegada(mov, { admin = false } = {}) {
    if (!movimentacaoFaccaoAtiva(mov)) return { tipo: "nenhuma", rotulo: "Sem ação", disabled: true };
    if (texto(mov.dataChegada)) return { tipo: "nenhuma", rotulo: "Chegada confirmada", disabled: true };
    if (admin) return { tipo: "confirmar", rotulo: "Confirmar chegada", disabled: false };
    if (podeInformarChegada(mov)) return { tipo: "informar", rotulo: "Informar chegada", disabled: false };
    return { tipo: "nenhuma", rotulo: "Aviso enviado", disabled: true };
  }

  prepararConfirmacao(id) {
    const movimentacao = this.obter(id);
    if (!movimentacao) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
    const ordem = movimentacao.opId ? this.store.obter("ordens", movimentacao.opId) : null;
    const faltantes = ehSutiaCompleto(movimentacao)
      ? componentesFaltantesOperacionais({
          movimentacao,
          ordem,
          referenciaEspecial: this.referenciaEspecial
        })
      : [];

    return {
      ok: true,
      erros: [],
      movimentacao,
      ordem,
      faltantes
    };
  }

  informarChegada(args) {
    return this.operacionalService.informarChegada(args);
  }

  async confirmarChegada({ id, respostasComponentes = {}, ...entrada }) {
    const preparado = this.prepararConfirmacao(id);
    if (!preparado.ok) return preparado;

    let componentes = {};
    if (preparado.faltantes.length) {
      const respostas = validarRespostasComponentes({
        faltantes: preparado.faltantes,
        respostas: respostasComponentes
      });
      if (!respostas.ok) return respostas;
      componentes = componentesParaPatch({
        movimentacao: preparado.movimentacao,
        ordem: preparado.ordem,
        respostas: respostas.dados,
        referenciaEspecial: this.referenciaEspecial
      });
    }

    return this.operacionalService.confirmarChegada({
      id,
      ...entrada,
      componentes
    });
  }

  listarDestinosReenvio(processo) {
    const canonico = processoCanonico(processo);
    return listarFaccoesPorProcesso(
      this.store.listar("faccoes"),
      canonico,
      { nomesFallback: this.fallbackFaccoesPorProcesso[canonico] || [] }
    );
  }

  reenviar(args) {
    return this.operacionalService.reenviar(args);
  }
}
