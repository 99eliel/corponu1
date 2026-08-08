import {
  arredondar2,
  inteiro,
  normalizar,
  normalizarCompetencia,
  numero,
  processoCanonico,
  texto
} from "./normalizacao.mjs";
import { nomeFaccaoCanonico } from "./faccoes-regras.mjs";

export const STATUS_PAGAMENTO = Object.freeze({
  PENDENTE: "pendente",
  PAGO: "pago",
  SEM_VALOR: "sem_valor",
  CANCELADO: "cancelado"
});

function statusCanonico(valor, item = {}) {
  const chave = normalizar(valor);
  if (item?.valorPendente === true || ["SEM VALOR", "SEM_VALOR", "AGUARDANDO VALOR"].includes(chave)) {
    return STATUS_PAGAMENTO.SEM_VALOR;
  }
  if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(chave)) return STATUS_PAGAMENTO.PAGO;
  if (["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"].includes(chave)) {
    return STATUS_PAGAMENTO.CANCELADO;
  }
  return STATUS_PAGAMENTO.PENDENTE;
}

function competenciaDaData(valor) {
  const bruto = texto(valor);
  const match = bruto.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export function competenciaDoPagamento(item = {}) {
  return normalizarCompetencia(item.competencia)
    || competenciaDaData(item.dataEntrega)
    || competenciaDaData(item.dataChegada)
    || competenciaDaData(item.dataPagamento);
}

export function tipoRegistroFinanceiro(item = {}) {
  return item?.tipoDocumento === "lancamento_financeiro_v2" || item?.origem === "fechamento_financeiro_v2"
    ? "v2"
    : "historico";
}

export function normalizarPagamento(item = {}) {
  const responsavel = nomeFaccaoCanonico(item.responsavel || item.faccao || item.quemFez || item.nomeFaccao);
  const quantidade = inteiro(item.quantidade ?? item.quantidadePaga ?? item.quantidadeRecebida ?? item.quantidadeEnviada);
  const valorUnitario = Math.max(0, numero(item.valorUnitario ?? item.valor ?? item.precoUnitario, 0));
  const totalInformado = Math.max(0, numero(item.total ?? item.valorTotal ?? item.subtotal, 0));
  const total = totalInformado > 0 ? arredondar2(totalInformado) : arredondar2(quantidade * valorUnitario);
  const statusPagamento = statusCanonico(item.statusPagamento || item.status, item);
  const tipoRegistro = tipoRegistroFinanceiro(item);

  return {
    ...item,
    id: texto(item.id || item.chaveFechamento),
    numeroOP: texto(item.numeroOP || item.numeroOPExterno || item.op || item.numeroOrdem),
    referencia: texto(item.referencia),
    cor: texto(item.cor),
    competencia: competenciaDoPagamento(item),
    processo: processoCanonico(item.processo || item.servicoNome || item.servico || item.processoMovimentacao),
    responsavel,
    faccao: responsavel,
    quantidade,
    quantidadeOP: inteiro(item.quantidadeOP),
    valorUnitario,
    total,
    statusPagamento,
    tipoRegistroFinanceiro: tipoRegistro,
    historico: tipoRegistro === "historico",
    origem: texto(item.origem),
    dataReferencia: texto(item.dataEntrega || item.dataChegada || item.dataPagamento),
    criadoEm: item.criadoEm || "",
    pagoEm: item.pagoEm || item.dataPagamento || ""
  };
}

function contem(valor, busca) {
  return !busca || normalizar(valor).includes(normalizar(busca));
}

export function filtrarPagamentos(pagamentos = [], filtros = {}) {
  const competencia = normalizarCompetencia(filtros.competencia);
  const status = texto(filtros.status).toLowerCase();
  const origem = texto(filtros.origem).toLowerCase();

  return (pagamentos || [])
    .map(normalizarPagamento)
    .filter(item => {
      if (competencia && item.competencia !== competencia) return false;
      if (status && status !== "todos" && item.statusPagamento !== status) return false;
      if (origem && origem !== "todos" && item.tipoRegistroFinanceiro !== origem) return false;
      if (!contem(item.responsavel, filtros.responsavel)) return false;
      if (!contem(item.referencia, filtros.referencia)) return false;
      if (!contem(item.processo, filtros.processo)) return false;
      if (!contem(item.numeroOP, filtros.numeroOP)) return false;
      return true;
    })
    .sort((a, b) => {
      const dataA = texto(a.dataReferencia || a.competencia || a.criadoEm);
      const dataB = texto(b.dataReferencia || b.competencia || b.criadoEm);
      return dataB.localeCompare(dataA);
    });
}

export function resumirPagamentos(pagamentos = []) {
  const itens = (pagamentos || []).map(normalizarPagamento);
  const pendentes = itens.filter(item => item.statusPagamento === STATUS_PAGAMENTO.PENDENTE);
  const pagos = itens.filter(item => item.statusPagamento === STATUS_PAGAMENTO.PAGO);
  const semValor = itens.filter(item => item.statusPagamento === STATUS_PAGAMENTO.SEM_VALOR);
  const historicos = itens.filter(item => item.tipoRegistroFinanceiro === "historico");
  const v2 = itens.filter(item => item.tipoRegistroFinanceiro === "v2");
  return {
    quantidadeLancamentos: itens.length,
    quantidadePecas: itens.reduce((soma, item) => soma + item.quantidade, 0),
    total: arredondar2(itens.reduce((soma, item) => soma + item.total, 0)),
    totalPendente: arredondar2(pendentes.reduce((soma, item) => soma + item.total, 0)),
    totalPago: arredondar2(pagos.reduce((soma, item) => soma + item.total, 0)),
    pendentes: pendentes.length,
    pagos: pagos.length,
    semValor: semValor.length,
    historicos: historicos.length,
    v2: v2.length
  };
}

export function calcularSaldoPorOPProcesso({ pagamentos = [], numeroOP, processo, quantidadeOP = 0 } = {}) {
  const op = normalizar(numeroOP);
  const proc = processoCanonico(processo);
  const totalOP = inteiro(quantidadeOP);
  const considerados = (pagamentos || [])
    .map(normalizarPagamento)
    .filter(item => item.statusPagamento !== STATUS_PAGAMENTO.CANCELADO)
    .filter(item => normalizar(item.numeroOP) === op && item.processo === proc);
  const fechado = considerados.reduce((soma, item) => soma + item.quantidade, 0);
  return {
    quantidadeOP: totalOP,
    quantidadeFechada: fechado,
    quantidadeRestante: Math.max(totalOP - fechado, 0),
    excedente: Math.max(fechado - totalOP, 0),
    completo: totalOP > 0 && fechado >= totalOP
  };
}

function chavePixDaFaccao(faccao = {}) {
  return texto(faccao.chavePix || faccao.pix || faccao.pixChave);
}

export function indicePixFaccoes(faccoes = []) {
  const mapa = new Map();
  for (const faccao of faccoes || []) {
    const nome = nomeFaccaoCanonico(faccao.nome || faccao.razaoSocial || faccao.id);
    if (!nome) continue;
    mapa.set(normalizar(nome), {
      nome,
      pix: chavePixDaFaccao(faccao),
      titularPix: texto(faccao.titularPix)
    });
  }
  return mapa;
}

export function relatorioSimplificadoPix(pagamentos = [], faccoes = []) {
  const pix = indicePixFaccoes(faccoes);
  const grupos = new Map();
  for (const item of (pagamentos || []).map(normalizarPagamento)) {
    if ([STATUS_PAGAMENTO.CANCELADO, STATUS_PAGAMENTO.SEM_VALOR].includes(item.statusPagamento)) continue;
    const chave = normalizar(item.responsavel);
    if (!chave) continue;
    const atual = grupos.get(chave) || {
      nome: item.responsavel,
      pix: pix.get(chave)?.pix || "",
      titularPix: pix.get(chave)?.titularPix || "",
      valor: 0,
      lancamentos: 0
    };
    atual.valor = arredondar2(atual.valor + item.total);
    atual.lancamentos += 1;
    grupos.set(chave, atual);
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}

export function pagamentosPendentesParaQuitacao(pagamentos = []) {
  return (pagamentos || [])
    .map(normalizarPagamento)
    .filter(item => item.id && item.statusPagamento === STATUS_PAGAMENTO.PENDENTE && item.total > 0);
}

export function resumoQuitacao(pagamentos = []) {
  const itens = pagamentosPendentesParaQuitacao(pagamentos);
  return {
    ids: itens.map(item => item.id),
    quantidade: itens.length,
    total: arredondar2(itens.reduce((soma, item) => soma + item.total, 0))
  };
}
