import {
  PROCESSO_SUTIA_COMPLETO,
  calcularPagamentoProcesso
} from "./financeiro-regras.mjs";
import {
  inteiro,
  normalizarReferencia,
  numero,
  processoCanonico
} from "./normalizacao.mjs";
import { normalizarOPLegada } from "./op-normalizador.mjs";

const NOMES_COMPONENTES = Object.freeze(["lateral", "bojo", "fecho", "pontoLuz"]);

function exigirMetodo(objeto, nome) {
  if (!objeto || typeof objeto[nome] !== "function") {
    throw new Error(`valoresRepo.${nome} não foi configurado.`);
  }
}

function valorComponenteParaCalculo(valor) {
  if (valor && typeof valor === "object") {
    if (valor.informado !== true) return null;
    if (valor.pronto === true) return true;
    if (valor.pronto === false) return false;
    return null;
  }
  return valor;
}

export function componentesFinanceirosDaOP(op = {}, respostas = {}) {
  const origem = op?.componentes || {};
  const resultado = {};

  for (const nome of NOMES_COMPONENTES) {
    const respostaExiste = Object.prototype.hasOwnProperty.call(respostas || {}, nome) &&
      respostas[nome] !== "" && respostas[nome] !== undefined;
    resultado[nome] = valorComponenteParaCalculo(
      respostaExiste ? respostas[nome] : origem[nome]
    );
  }

  return resultado;
}

export class MotorValoresV2 {
  constructor({ valoresRepo }) {
    exigirMetodo(valoresRepo, "buscarValorUnitario");
    exigirMetodo(valoresRepo, "buscarConfiguracaoSutiaCompleto");
    exigirMetodo(valoresRepo, "buscarValoresComponentes");
    this.valoresRepo = valoresRepo;
  }

  async diagnosticarComponentes({ op, processo } = {}) {
    const ordem = normalizarOPLegada(op || {});
    const processoNormalizado = processoCanonico(processo);

    if (processoNormalizado !== PROCESSO_SUTIA_COMPLETO) {
      return {
        exigeConferencia: false,
        especial: false,
        faltantes: [],
        conhecidos: {},
        componentes: {}
      };
    }

    const configuracao = await this.valoresRepo.buscarConfiguracaoSutiaCompleto();
    const referencia = normalizarReferencia(ordem.referencia);
    const referenciaEspecial = normalizarReferencia(configuracao?.referenciaEspecial || "912");
    const especial = Boolean(referencia && referenciaEspecial && referencia === referenciaEspecial);
    const componentes = componentesFinanceirosDaOP(ordem);

    if (especial) {
      return {
        exigeConferencia: false,
        especial: true,
        faltantes: [],
        conhecidos: {},
        componentes
      };
    }

    const faltantes = NOMES_COMPONENTES.filter(nome => componentes[nome] === null);
    const conhecidos = Object.fromEntries(
      NOMES_COMPONENTES
        .filter(nome => componentes[nome] !== null)
        .map(nome => [nome, componentes[nome]])
    );

    return {
      exigeConferencia: faltantes.length > 0,
      especial: false,
      faltantes,
      conhecidos,
      componentes
    };
  }

  async calcular({ op, processo, quantidade, componentes = {} } = {}) {
    const ordem = normalizarOPLegada(op || {});
    const processoNormalizado = processoCanonico(processo);
    const qtd = inteiro(quantidade);

    if (processoNormalizado !== PROCESSO_SUTIA_COMPLETO) {
      const valorUnitario = await this.valoresRepo.buscarValorUnitario(
        ordem.referencia,
        processoNormalizado
      );
      return calcularPagamentoProcesso({
        processo: processoNormalizado,
        referencia: ordem.referencia,
        quantidade: qtd,
        valorUnitario
      });
    }

    const configuracao = await this.valoresRepo.buscarConfiguracaoSutiaCompleto();
    const referencia = normalizarReferencia(ordem.referencia);
    const referenciaEspecial = normalizarReferencia(configuracao?.referenciaEspecial || "912");
    const especial = Boolean(referencia && referenciaEspecial && referencia === referenciaEspecial);
    const componentesResolvidos = componentesFinanceirosDaOP(ordem, componentes);

    if (especial || numero(configuracao?.valorBaseGeral, 0) <= 0) {
      return calcularPagamentoProcesso({
        processo: processoNormalizado,
        referencia: ordem.referencia,
        quantidade: qtd,
        componentes: componentesResolvidos,
        configuracaoSutiaCompleto: configuracao,
        valoresComponentes: {}
      });
    }

    const valoresComponentes = await this.valoresRepo.buscarValoresComponentes(ordem.referencia);
    return calcularPagamentoProcesso({
      processo: processoNormalizado,
      referencia: ordem.referencia,
      quantidade: qtd,
      componentes: componentesResolvidos,
      configuracaoSutiaCompleto: configuracao,
      valoresComponentes
    });
  }
}
