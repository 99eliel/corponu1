import { criarDocumentoFechamento, validarSaldoProcesso } from "./financeiro-regras.mjs";
import { MotorValoresV2 } from "./motor-valores.mjs";
import { normalizarOPLegada } from "./op-normalizador.mjs";
import { processoCanonico, texto } from "./normalizacao.mjs";

function exigirMetodo(objeto, nome, grupo) {
  if (!objeto || typeof objeto[nome] !== "function") {
    throw new Error(`${grupo}.${nome} não foi configurado.`);
  }
}

export class FechamentoFinanceiroService {
  constructor({ ordensRepo, valoresRepo, pagamentosRepo }) {
    exigirMetodo(ordensRepo, "buscarPorNumero", "ordensRepo");
    exigirMetodo(pagamentosRepo, "obterSaldoProcesso", "pagamentosRepo");
    exigirMetodo(pagamentosRepo, "salvarComSaldo", "pagamentosRepo");

    this.ordensRepo = ordensRepo;
    this.valoresRepo = valoresRepo;
    this.pagamentosRepo = pagamentosRepo;
    this.motorValores = new MotorValoresV2({ valoresRepo });
  }

  normalizarOP(op) {
    return normalizarOPLegada(op || {});
  }

  async carregarOP(numeroOP) {
    const numero = texto(numeroOP);
    if (!numero) return { ok: false, erros: ["OP_NAO_INFORMADA"], op: null };

    const op = await this.ordensRepo.buscarPorNumero(numero);
    if (!op) return { ok: false, erros: ["OP_NAO_ENCONTRADA"], op: null };

    return { ok: true, erros: [], op: this.normalizarOP(op) };
  }

  async diagnosticarComponentes({ op, processo } = {}) {
    return this.motorValores.diagnosticarComponentes({
      op: this.normalizarOP(op),
      processo
    });
  }

  async consultarSaldo({ op, processo } = {}) {
    const ordem = this.normalizarOP(op);
    return this.pagamentosRepo.obterSaldoProcesso({
      opId: ordem.id,
      numeroOP: ordem.numeroOP,
      processo: processoCanonico(processo),
      quantidadeOP: ordem.quantidade
    });
  }

  async calcular({ op, processo, quantidade, componentes = {} }) {
    return this.motorValores.calcular({
      op: this.normalizarOP(op),
      processo,
      quantidade,
      componentes
    });
  }

  async prepararLancamento(entrada = {}) {
    const opCarregada = entrada.op
      ? { ok: true, erros: [], op: this.normalizarOP(entrada.op) }
      : await this.carregarOP(entrada.numeroOP);

    if (!opCarregada.ok) {
      return {
        ok: false,
        erros: opCarregada.erros,
        op: null,
        saldo: null,
        calculo: null,
        documento: null
      };
    }

    const op = opCarregada.op;
    const saldo = await this.consultarSaldo({ op, processo: entrada.processo });
    const validacaoSaldo = validarSaldoProcesso({
      quantidadeOP: op.quantidade,
      quantidadeFechada: saldo.quantidadeFechada,
      quantidadeNova: entrada.quantidade
    });

    if (!validacaoSaldo.ok) {
      return {
        ok: false,
        erros: validacaoSaldo.erros,
        op,
        saldo: { ...saldo, ...validacaoSaldo },
        calculo: null,
        documento: null
      };
    }

    const calculo = await this.calcular({
      op,
      processo: entrada.processo,
      quantidade: entrada.quantidade,
      componentes: entrada.componentes
    });

    const documento = criarDocumentoFechamento({
      op,
      processo: entrada.processo,
      responsavel: entrada.responsavel,
      competencia: entrada.competencia,
      quantidade: entrada.quantidade,
      calculo,
      observacoes: entrada.observacoes
    });

    return {
      ok: documento.ok,
      erros: documento.erros,
      op,
      saldo: { ...saldo, ...validacaoSaldo },
      calculo,
      documento: documento.documento
    };
  }

  async salvarLancamento(entrada = {}) {
    const preparado = await this.prepararLancamento(entrada);
    if (!preparado.ok) return preparado;

    const persistencia = await this.pagamentosRepo.salvarComSaldo(
      preparado.documento,
      { saldoInicial: preparado.saldo }
    );

    if (!persistencia?.ok) {
      return {
        ...preparado,
        ok: false,
        erros: [persistencia?.motivo || "FALHA_AO_SALVAR_LANCAMENTO"],
        saldo: persistencia?.saldo || preparado.saldo,
        existente: persistencia?.existente || null
      };
    }

    return {
      ...preparado,
      ok: true,
      erros: [],
      saldo: persistencia.saldo || preparado.saldo,
      salvo: persistencia.documento
    };
  }
}
