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
  CANCELADO: "cancelado"
});

function statusCanonico(valor) {
  const chave = normalizar(valor);
  if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(chave)) return STATUS_PAGAMENTO.PAGO;
  if (["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(chave)) return STATUS_PAGAMENTO.CANCELADO;
  return STATUS_PAGAMENTO.PENDENTE;
}

export function normalizarPagamento(item = {}) {
  const responsavel = nomeFaccaoCanonico(item.responsavel || item.faccao || item.quemFez || item.nomeFaccao);
  const quantidade = inteiro(item.quantidade ?? item.quantidadePaga ?? item.quantidadeRecebida ?? item.quantidadeEnviada);
  const valorUnitario = Math.max(0, numero(item.valorUnitario ?? item.valor ?? item.precoUnitario, 0));
  const totalInformado = Math.max(0, numero(item.total ?? item.valorTotal ?? item.subtotal, 0));
  const total = totalInformado > 0 ? arredondar2(totalInformado) : arredondar2(quantidade * valorUnitario);

  return {
    ...item,
    id: texto(item.id || item.chaveFechamento),
    numeroOP: texto(item.numeroOP || item.numeroOPExterno || item.op),
    referencia: texto(item.referencia),
    cor: texto(item.cor),
    competencia: normalizarCompetencia(item.competencia),
    processo: processoCanonico(item.processo || item.servicoNome || item.servico),
    responsavel,
    faccao: responsavel,
    quantidade,
    quantidadeOP: inteiro(item.quantidadeOP),
    valorUnitario,
    total,
    statusPagamento: statusCanonico(item.statusPagamento || item.status),
    origem: texto(item.origem),
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

  return (pagamentos || [])
    .map(normalizarPagamento)
    .filter(item => {
      if (competencia && item.competencia !== competencia) return false;
      if (status && status !== "todos" && item.statusPagamento !== status) return false;
      if (!contem(item.responsavel, filtros.responsavel)) return false;
      if (!contem(item.referencia, filtros.referencia)) return false;
      if (!contem(item.processo, filtros.processo)) return false;
      if (!contem(item.numeroOP, filtros.numeroOP)) return false;
      return true;
    })
    .sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
}

export function resumirPagamentos(pagamentos = []) {
  const itens = (pagamentos || []).map(normalizarPagamento);
  const pendentes = itens.filter(item => item.statusPagamento === STATUS_PAGAMENTO.PENDENTE);
  const pagos = itens.filter(item => item.statusPagamento === STATUS_PAGAMENTO.PAGO);
  return {
    quantidadeLancamentos: itens.length,
    quantidadePecas: itens.reduce((soma, item) => soma + item.quantidade, 0),
    total: arredondar2(itens.reduce((soma, item) => soma + item.total, 0)),
    totalPendente: arredondar2(pendentes.reduce((soma, item) => soma + item.total, 0)),
    totalPago: arredondar2(pagos.reduce((soma, item) => soma + item.total, 0)),
    pendentes: pendentes.length,
    pagos: pagos.length
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
    if (item.statusPagamento === STATUS_PAGAMENTO.CANCELADO) continue;
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
    .filter(item => item.id && item.statusPagamento === STATUS_PAGAMENTO.PENDENTE);
}

export function resumoQuitacao(pagamentos = []) {
  const itens = pagamentosPendentesParaQuitacao(pagamentos);
  return {
    ids: itens.map(item => item.id),
    quantidade: itens.length,
    total: arredondar2(itens.reduce((soma, item) => soma + item.total, 0))
  };
}
