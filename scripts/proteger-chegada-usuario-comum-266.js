const fs = require('fs');

const OLD = '2026-08-28-faccoes-relatorio-filtrado-265';
const NEW = '2026-08-28-chegada-usuario-somente-aviso-266';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Bloco duplicado: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}
function replaceRelease(path) {
  const text = read(path);
  if (!text.includes(OLD)) throw new Error(`Release anterior não encontrado em ${path}`);
  write(path, text.split(OLD).join(NEW));
}

let app = read('app.js');

// 1) O gerador financeiro também é uma fronteira de permissão.
app = replaceOnce(
  app,
  `async function gerarPagamentoPorMovimentacao(mov) {\n  await garantirPrecosReferenciaCarregados();`,
  `async function gerarPagamentoPorMovimentacao(mov) {\n  if (mov?.tipoDestino === "faccao" && !ehAdmin()) {\n    return {\n      ok: false,\n      semPermissao: true,\n      motivo: "Apenas administrador pode gerar pagamento pela chegada de facção."\n    };\n  }\n\n  await garantirPrecosReferenciaCarregados();`,
  'guarda do gerador de pagamento'
);

// 2) A ação exibida na tabela passa a refletir a permissão real.
const markerFiltros = 'function getFiltrosFaccoesMovimentacoes() {';
if (!app.includes(markerFiltros)) throw new Error('Marcador dos filtros de Facções não encontrado');
if (app.includes('function htmlAcaoChegadaFaccoes(mov)')) throw new Error('Helper da ação de chegada já existe');
const helperAcao = `function htmlAcaoChegadaFaccoes(mov) {\n  const status = String(mov?.status || "em_andamento").trim().toLowerCase();\n  if (mov?.dataChegada || status === "finalizado" || status === "encaminhado") return "";\n\n  if (ehAdmin()) {\n    return \`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\${mov.id}')">Confirmar chegada</button>\`;\n  }\n\n  if (situacaoChegadaFaccoes(mov) === "avisada") {\n    return \`<button class="btn btn-sm" type="button" disabled>Aviso enviado</button>\`;\n  }\n\n  return \`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\${mov.id}')">Avisar que chegou</button>\`;\n}\n\n`;
app = app.replace(markerFiltros, helperAcao + markerFiltros);

const oldRowAction = `        \${mov.status !== "finalizado" && mov.status !== "encaminhado" ? \`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\${mov.id}')">Chegada</button>\` : ""}`;
const newRowAction = `        \${htmlAcaoChegadaFaccoes(mov)}`;
app = replaceOnce(app, oldRowAction, newRowAction, 'ação de chegada na tabela de Facções');

// 3) Aviso operacional canônico: grava apenas os campos de aviso, sem dataChegada e sem pagamento.
const markerRegistrar = 'function registrarChegadaMovimentacao(id) {';
if (!app.includes(markerRegistrar)) throw new Error('Função canônica de chegada não encontrada');
if (app.includes('async function avisarChegadaMovimentacaoFaccao(')) throw new Error('Aviso canônico já existe');
const avisoCanonico = `async function avisarChegadaMovimentacaoFaccao(id, movimentoRecebido = null) {\n  const mov = movimentoRecebido || state.movimentacoesProducao.find(item => String(item.id) === String(id));\n  if (!mov) {\n    toast("Movimentação não encontrada.");\n    return;\n  }\n\n  if (mov.tipoDestino !== "faccao") {\n    toast("O aviso de chegada é exclusivo para movimentações de facção.");\n    return;\n  }\n\n  if (ehAdmin()) {\n    registrarChegadaMovimentacao(id);\n    return;\n  }\n\n  if (mov.dataChegada || situacaoChegadaFaccoes(mov) === "confirmada") {\n    toast("Essa chegada já foi confirmada pelo administrador.");\n    return;\n  }\n\n  if (situacaoChegadaFaccoes(mov) === "avisada") {\n    toast("Essa chegada já foi avisada.");\n    return;\n  }\n\n  const status = String(mov.status || "em_andamento").trim().toLowerCase();\n  if (["finalizado", "cancelado", "cancelada", "excluido", "excluida"].includes(status)) {\n    toast("Essa movimentação não aceita aviso de chegada.");\n    return;\n  }\n\n  if (!confirm(\`Avisar que a OP \${mov.numeroOP || "-"} voltou de \${mov.destino || "facção"}? Nenhum pagamento será gerado.\`)) return;\n\n  const nomeUsuario = state.perfil?.nome || state.currentUser?.displayName || state.currentUser?.email || "Usuário";\n  const emailUsuario = state.perfil?.email || state.currentUser?.email || "";\n  const dadosAviso = {\n    chegadaInformada: true,\n    chegadaInformadaStatus: "aguardando_confirmacao_admin",\n    chegadaInformadaData: getDataHojeISO(),\n    chegadaInformadaEm: serverTimestamp(),\n    chegadaInformadaPor: state.currentUser.uid,\n    chegadaInformadaPorNome: nomeUsuario,\n    chegadaInformadaPorEmail: emailUsuario,\n    statusOperacional: "chegada_informada",\n    atualizadoPor: state.currentUser.uid,\n    atualizadoEm: serverTimestamp()\n  };\n\n  try {\n    await setDoc(doc(db, "movimentacoesProducao", String(id)), dadosAviso, { merge: true });\n    Object.assign(mov, dadosAviso);\n    await registrarLog(\n      "chegada_faccao_informada",\n      "movimentacaoProducao",\n      String(id),\n      \`OP \${mov.numeroOP || "-"} | \${mov.destino || "-"} | \${mov.processo || "-"} | sem pagamento\`\n    );\n    renderFaccoesMovimentacoes();\n    toast("Chegada avisada. O pagamento só será gerado quando o administrador confirmar.");\n  } catch (error) {\n    console.error(error);\n    toast("Não foi possível avisar a chegada.");\n  }\n}\n\n`;
app = app.replace(markerRegistrar, avisoCanonico + markerRegistrar);

// 4) A própria entrada canônica decide: facção + comum = aviso; admin = modal financeiro.
app = replaceOnce(
  app,
  `function registrarChegadaMovimentacao(id) {\n  const mov = state.movimentacoesProducao.find(item => item.id === id);\n  if (!mov) return;\n\n  chegadaModalMovimentacaoId = id;`,
  `function registrarChegadaMovimentacao(id) {\n  const mov = state.movimentacoesProducao.find(item => item.id === id);\n  if (!mov) return;\n\n  if (mov.tipoDestino === "faccao" && !ehAdmin()) {\n    return avisarChegadaMovimentacaoFaccao(id, mov);\n  }\n\n  chegadaModalMovimentacaoId = id;`,
  'desvio canônico antes do modal financeiro'
);

// 5) Segunda barreira: mesmo modal antigo/aberto ou chamada direta não confirma facção como usuário comum.
app = replaceOnce(
  app,
  `async function confirmarChegadaMovimentacao(event) {\n  event.preventDefault();`,
  `async function confirmarChegadaMovimentacao(event) {\n  event?.preventDefault?.();`,
  'submit robusto da confirmação'
);

app = replaceOnce(
  app,
  `  if (!mov) {\n    toast("Movimentação não encontrada.");\n    return;\n  }\n\n  const dataChegada = document.getElementById("chegadaData")?.value || "";`,
  `  if (!mov) {\n    toast("Movimentação não encontrada.");\n    return;\n  }\n\n  if (mov.tipoDestino === "faccao" && !ehAdmin()) {\n    fecharModalChegadaMovimentacao();\n    toast("Apenas administrador pode confirmar a chegada e gerar pagamento.");\n    return;\n  }\n\n  const dataChegada = document.getElementById("chegadaData")?.value || "";`,
  'guarda dura antes da confirmação financeira'
);

// 6) A confirmação administrativa e a autorização financeira são gravadas na mesma atualização da chegada.
app = replaceOnce(
  app,
  `  try {\n    await setDoc(doc(db, "movimentacoesProducao", id), {\n      dataChegada,\n      falta,\n      descontoDefeito,\n      defeito: descontoDefeito,\n      quantidadeRecebida,\n      status: "retornou",\n      atualizadoPor: state.currentUser.uid,\n      atualizadoEm: serverTimestamp()\n    }, { merge: true });\n\n    const movAtualizada = {\n      ...mov,\n      dataChegada,\n      falta,\n      descontoDefeito,\n      defeito: descontoDefeito,\n      quantidadeRecebida,\n      status: "retornou"\n    };`,
  `  const confirmacaoFinanceira = mov.tipoDestino === "faccao" ? {\n    chegadaInformada: false,\n    chegadaInformadaStatus: "confirmada_admin",\n    confirmacaoChegadaFinanceira: true,\n    chegadaConfirmadaPor: state.currentUser.uid,\n    chegadaConfirmadaPorNome: state.perfil?.nome || state.currentUser?.displayName || state.currentUser?.email || "Administrador",\n    chegadaConfirmadaEm: serverTimestamp(),\n    statusOperacional: "chegada_confirmada"\n  } : {};\n\n  try {\n    await setDoc(doc(db, "movimentacoesProducao", id), {\n      dataChegada,\n      falta,\n      descontoDefeito,\n      defeito: descontoDefeito,\n      quantidadeRecebida,\n      status: "retornou",\n      ...confirmacaoFinanceira,\n      atualizadoPor: state.currentUser.uid,\n      atualizadoEm: serverTimestamp()\n    }, { merge: true });\n\n    const movAtualizada = {\n      ...mov,\n      dataChegada,\n      falta,\n      descontoDefeito,\n      defeito: descontoDefeito,\n      quantidadeRecebida,\n      status: "retornou",\n      ...confirmacaoFinanceira\n    };`,
  'metadados atômicos da confirmação administrativa'
);

write('app.js', app);

// 7) Release/cache busting coerente, sem módulos paralelos.
['index.html', 'update.js', 'corponu-atualizador.js'].forEach(replaceRelease);

const release = {
  version: NEW,
  updatedAt: '2026-08-28T15:20:00-03:00',
  notes: 'Produção. Corrigida estruturalmente a chegada de Facções por perfil. Usuário comum não abre mais o modal financeiro: a função canônica registrarChegadaMovimentacao intercepta a movimentação de facção antes do modal e grava somente chegadaInformada/aguardando_confirmacao_admin, sem dataChegada e sem gerar pagamento. A tabela mostra Avisar que chegou para usuário comum, Aviso enviado após o registro e Confirmar chegada somente para administrador. confirmarChegadaMovimentacao possui uma segunda barreira que recusa usuário não admin mesmo em modal antigo ou chamada direta, e gerarPagamentoPorMovimentacao também recusa geração financeira de facção fora do perfil admin. A confirmação administrativa grava confirmação financeira e baixa do aviso na mesma atualização da movimentação. Células mantêm o fluxo atual. Nenhuma consulta, observer, timer ou regra Firebase foi adicionada.'
};
write('corponu-release.json', JSON.stringify(release, null, 2) + '\n');
write('version.json', JSON.stringify({
  version: NEW,
  updatedAt: release.updatedAt,
  notes: 'Chegada de facção protegida por perfil no núcleo: usuário comum apenas avisa; somente admin confirma e gera pagamento.'
}, null, 2) + '\n');

// Pós-condições locais antes de o workflow sequer validar sintaxe.
const finalApp = read('app.js');
const finalIndex = read('index.html');
const required = [
  'async function avisarChegadaMovimentacaoFaccao(',
  'function htmlAcaoChegadaFaccoes(mov)',
  'Avisar que chegou',
  'Aviso enviado',
  'Apenas administrador pode confirmar a chegada e gerar pagamento.',
  'Apenas administrador pode gerar pagamento pela chegada de facção.',
  'confirmacaoChegadaFinanceira: true',
  'chegadaInformadaStatus: "aguardando_confirmacao_admin"'
];
for (const item of required) {
  if (!finalApp.includes(item)) throw new Error(`Pós-condição ausente: ${item}`);
}
if (!finalIndex.includes(NEW)) throw new Error('index.html não foi versionado para 266');
if (finalApp.includes(`>Chegada</button>`)) {
  const trechoFaccoes = finalApp.slice(finalApp.indexOf('function renderFaccoesMovimentacoes()'), finalApp.indexOf('function editarFaccao('));
  if (trechoFaccoes.includes(`>Chegada</button>`)) throw new Error('Botão genérico Chegada permaneceu na tabela de Facções');
}
console.log('Proteção estrutural da chegada de facção 266 aplicada com sucesso.');
