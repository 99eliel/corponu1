import fs from 'node:fs';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

function agruparPagamentoOriginal(entregas) {
  const mapa = new Map();

  entregas.forEach(item => {
    const processo = item.processo || item.servicoNome || '-';
    const precoId = item.precoReferenciaId || item.servicoId || `${item.referencia}-${item.setor}-${processo}`;
    const chave = `${item.faccao}||${precoId}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        faccao: item.faccao,
        referencia: item.referencia || '-',
        precoReferenciaId: precoId,
        processo,
        setor: item.setor,
        entregas: 0,
        quantidade: 0,
        valorUnitario: Number(item.valorUnitario || 0),
        total: 0
      });
    }

    const grupo = mapa.get(chave);
    grupo.entregas += 1;
    grupo.quantidade += Number(item.quantidade || 0);
    grupo.valorUnitario = Number(item.valorUnitario || 0);
    grupo.total += Number(item.total || 0);
  });

  return [...mapa.values()].sort((a, b) => {
    const faccaoCompare = a.faccao.localeCompare(b.faccao, 'pt-BR', { numeric: true });
    if (faccaoCompare !== 0) return faccaoCompare;
    const refCompare = String(a.referencia).localeCompare(String(b.referencia), 'pt-BR', { numeric: true });
    if (refCompare !== 0) return refCompare;
    return a.processo.localeCompare(b.processo, 'pt-BR', { numeric: true });
  });
}

function texto(valor) {
  return String(valor ?? '').trim();
}

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function normalizarEstrutura(dados) {
  const saida = { ...dados };

  let faccao = textoValido(saida.faccao) ? saida.faccao.trim() : '';
  if (!faccao) {
    faccao = texto(saida.destino || saida.faccaoNome || saida.destinoNome || saida.responsavelFaccao || saida.responsavel || '');
  }
  if (!faccao) faccao = 'SEM FACÇÃO';
  saida.faccao = faccao;

  let processo = textoValido(saida.processo) ? saida.processo.trim() : '';
  if (!processo) processo = texto(saida.servicoNome || saida.processoMovimentacao || saida.servico || saida.tipoProcesso || '');
  if (!processo) processo = 'SEM PROCESSO';
  saida.processo = processo;
  if (!textoValido(saida.servicoNome)) saida.servicoNome = processo;

  if (saida.referencia != null && typeof saida.referencia !== 'string') saida.referencia = texto(saida.referencia);
  if (saida.numeroOP != null && typeof saida.numeroOP !== 'string') saida.numeroOP = texto(saida.numeroOP);
  if (saida.setor != null && typeof saida.setor !== 'string') saida.setor = texto(saida.setor).toLowerCase() || 'sutia';

  return saida;
}

const base = Array.from({ length: 261 }, (_, i) => ({
  id: `pag-${i}`,
  faccao: i % 2 ? 'MARILIA' : 'GOIANIRA',
  referencia: String(200 + (i % 50)),
  processo: i % 2 ? 'CALCINHA COMPLETA' : 'SUTIÃ COMPLETO',
  setor: i % 2 ? 'calcinha' : 'sutia',
  quantidade: 10 + (i % 7),
  valorUnitario: 1.25,
  total: (10 + (i % 7)) * 1.25,
  statusPagamento: 'pendente'
}));

// Reproduz o defeito real: um único documento estruturalmente inválido derruba o sort inteiro.
const comDefeito = [...base, {
  id: 'pag-malformado',
  faccao: undefined,
  destino: 'JEAN',
  referencia: 900,
  processo: undefined,
  servicoNome: 'CALCINHA COMPLETA',
  setor: 'calcinha',
  quantidade: 4,
  valorUnitario: 1.5,
  total: 6,
  statusPagamento: 'pendente'
}];

assert.throws(() => agruparPagamentoOriginal(comDefeito), TypeError, 'O cenário antigo deveria reproduzir o crash por faccao inválida.');

const normalizados = comDefeito.map(normalizarEstrutura);
const grupos = agruparPagamentoOriginal(normalizados);
assert.ok(grupos.length > 0, 'Após normalização, a tela precisa conseguir agrupar os pagamentos.');
assert.equal(normalizados.at(-1).faccao, 'JEAN');
assert.equal(normalizados.at(-1).processo, 'CALCINHA COMPLETA');
assert.equal(normalizados.at(-1).referencia, '900');
assert.equal(normalizados.at(-1).total, 6, 'A recuperação estrutural não pode alterar total.');
assert.equal(normalizados.at(-1).valorUnitario, 1.5, 'A recuperação estrutural não pode alterar valor unitário.');
assert.equal(normalizados.at(-1).quantidade, 4, 'A recuperação estrutural não pode alterar quantidade.');
assert.equal(normalizados.at(-1).statusPagamento, 'pendente', 'A recuperação estrutural não pode alterar status.');

// Carga: o agrupamento nativo deve continuar rápido com um histórico bem maior que o atual.
const carga = Array.from({ length: 10000 }, (_, i) => normalizarEstrutura({
  faccao: i % 3 === 0 ? 'GOIANIRA' : i % 3 === 1 ? 'MARILIA' : 'JEAN',
  referencia: 100 + (i % 120),
  processo: i % 2 ? 'CALCINHA COMPLETA' : 'SUTIÃ COMPLETO',
  setor: i % 2 ? 'calcinha' : 'sutia',
  quantidade: 10,
  valorUnitario: 1.25,
  total: 12.5,
  statusPagamento: 'pendente'
}));
const inicio = performance.now();
const gruposCarga = agruparPagamentoOriginal(carga);
const duracao = performance.now() - inicio;
assert.ok(gruposCarga.length > 0);
assert.ok(duracao < 1500, `Agrupamento de 10 mil registros demorou ${duracao.toFixed(1)}ms.`);

// Os módulos que disputavam a mesma tela precisam estar neutros na branch 247.
for (const arquivo of [
  'corponu-pagamentos-seguro.js',
  'corponu-pagamentos-manual.js',
  'corponu-pagamentos-multifiltro.js',
  'corponu-pagamentos-multifiltro-visual.js',
  'corponu-pagamentos-filtro-op.js',
  'corponu-pagamentos-alerta-sem-valor.js',
  'corponu-pagamentos-alerta-duplicidades.js',
  'corponu-pendencias-modal-estavel.js',
  'corponu-pendencias-valor-seguro.js',
  'corponu-verificacao-sutia-completo.js',
  'corponu-valores-pendentes-financeiro.js',
  'corponu-valores-pendentes-auth-214.js'
]) {
  const codigo = fs.readFileSync(arquivo, 'utf8');
  assert.ok(codigo.length < 1000, `${arquivo} ainda contém uma engine pesada (${codigo.length} bytes).`);
  assert.ok(!codigo.includes('MutationObserver'), `${arquivo} ainda contém MutationObserver.`);
  assert.ok(!codigo.includes('getDocs('), `${arquivo} ainda faz leitura própria do Firestore.`);
  assert.ok(!codigo.includes('setInterval('), `${arquivo} ainda mantém timer contínuo.`);
}

const recuperacao = fs.readFileSync('corponu-restantes-pagamento-automatico-245.js', 'utf8');
assert.ok(recuperacao.includes('fs.collection(db, "entregasPagamento")'), 'A recuperação precisa conferir toda a coleção sem orderBy.');
assert.ok(!/patch\.(total|valorUnitario|quantidade|statusPagamento|valorPendente)\s*=/.test(recuperacao), 'A recuperação não pode alterar valores, quantidade ou status.');

console.log(`TESTE_PAGAMENTOS_247_OK grupos=${grupos.length} carga10k=${duracao.toFixed(1)}ms`);
