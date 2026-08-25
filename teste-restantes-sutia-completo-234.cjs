const assert = require('node:assert/strict');

require('./corponu-restantes-sutia-completo-234.js');
const api = globalThis.__CORPONU_RESTANTES_SUTIA_COMPLETO_234_TEST_API__;
assert.ok(api, 'API de teste 234 não foi exposta');

const pagamentoBase = {
  id: 'pag-restante-1',
  processo: 'SUTIÃ COMPLETO',
  pagamentoComplementarRestante: true,
  movimentacaoId: 'restante-1',
  valorPendente: true,
  statusPagamento: 'sem_valor',
  valorTotalDefinidoManualmente: false,
  total: 0,
  valorUnitario: 0
};
const movimentoRestante = {
  id: 'restante-1',
  origemRestanteFaccao: true,
  origem: 'restante_faccao',
  chegadaComplementar: true
};

// 1. O bug real: restante de Sutiã Completo sem valor deve ser alvo.
assert.equal(api.pagamentoPrecisaReparo(pagamentoBase, movimentoRestante), true);

// 2. Lançamento manual legítimo que NÃO veio de restante não pode ser tocado.
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  pagamentoComplementarRestante: false,
  origemRestantePagamento: false,
  origem: 'lancamento_manual_pagamentos',
  pagamentoManualFinanceiro: true
}, { id: 'manual', origem: 'lancamento_manual_pagamentos' }), false);

// 3. Pagamento já pago/quitado deve ser imutável, mesmo sendo restante.
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  pago: true,
  statusPagamento: 'pago'
}, movimentoRestante), false);
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  statusPagamento: 'quitado'
}, movimentoRestante), false);

// 4. Valor manual antigo já conferido e positivo é preservado.
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  pagamentoManualFinanceiro: true,
  valorTotalDefinidoManualmente: true,
  valorPendente: false,
  valorManualFinanceiroPendente: false,
  statusPagamento: 'pendente',
  total: 750,
  valorUnitario: 5.5
}, movimentoRestante), false);

// 5. Registro transformado pela 233 ainda precisa passar pelo cálculo oficial de Sutiã Completo.
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  origemRestantePagamento: true,
  pagamentoManualFinanceiro: false,
  valorPendente: false,
  statusPagamento: 'pendente',
  total: 225.5,
  valorUnitario: 5.5,
  valorTotalDefinidoManualmente: false
}, movimentoRestante), true);

// 6. Sutiã Montagem não entra nesta correção específica.
assert.equal(api.pagamentoPrecisaReparo({
  ...pagamentoBase,
  processo: 'SUTIÃ MONTAGEM'
}, movimentoRestante), false);

// 7. Conferência completa da movimentação raiz deve ser reaproveitada.
const conferenciaRaiz = {
  fechoPronto: true,
  pontoLuzPronto: false,
  lateralPronta: true,
  lateralDescontada: false,
  bojoPronto: true,
  bojoDescontado: true
};
const planoRaiz = api.planoReparo({
  pagamento: pagamentoBase,
  movimento: movimentoRestante,
  raiz: { sutiaCompletoConferencia: conferenciaRaiz },
  pagamentoAnterior: null
});
assert.equal(planoRaiz.alvo, true);
assert.equal(planoRaiz.origem, 'movimento_raiz');
assert.equal(planoRaiz.conferencia.fechoPronto, true);
assert.equal(planoRaiz.conferencia.pontoLuzPronto, false);
assert.equal(planoRaiz.conferencia.bojoDescontado, true);

// 8. Se a raiz antiga não tiver a conferência, um pagamento oficial anterior da mesma OP pode restaurá-la.
const planoPagamentoAnterior = api.planoReparo({
  pagamento: pagamentoBase,
  movimento: movimentoRestante,
  raiz: { id: 'raiz-antiga' },
  pagamentoAnterior: {
    processo: 'SUTIÃ COMPLETO',
    fechoPronto: false,
    pontoLuzPronto: true,
    lateralPronta: true,
    lateralDescontada: true,
    bojoPronto: false,
    bojoDescontado: false,
    memoriaCalculoSutiaCompleto: {
      fechoPronto: false,
      pontoLuzPronto: true,
      lateralPronta: true,
      bojoPronto: false,
      descontoLateral: 0.45,
      descontoBojo: 0
    }
  }
});
assert.equal(planoPagamentoAnterior.alvo, true);
assert.equal(planoPagamentoAnterior.origem, 'pagamento_anterior');
assert.equal(planoPagamentoAnterior.conferencia.fechoPronto, false);
assert.equal(planoPagamentoAnterior.conferencia.pontoLuzPronto, true);
assert.equal(planoPagamentoAnterior.conferencia.lateralDescontada, true);

// 9. Sem Fecho/Ponto de luz definitivos, não inventa conferência.
const planoSemDados = api.planoReparo({
  pagamento: pagamentoBase,
  movimento: movimentoRestante,
  raiz: { lateralProntaSutiaCompleto: true },
  pagamentoAnterior: null
});
assert.equal(planoSemDados.alvo, true);
assert.equal(planoSemDados.conferencia, null);
assert.equal(planoSemDados.origem, 'sem_conferencia');

console.log('OK 234: 9 cenários críticos de Restantes/Sutiã Completo passaram.');
