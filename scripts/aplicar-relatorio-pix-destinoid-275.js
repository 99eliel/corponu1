const fs = require('fs');

const OLD = '2026-08-31-pagamentos-faccao-exata-274';
const RELEASE = '2026-08-31-pagamentos-pix-destinoid-275';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function replaceOnce(text, before, after, label) {
  const i = text.indexOf(before);
  assert(i >= 0, label + ': bloco não encontrado');
  assert(text.indexOf(before, i + before.length) < 0, label + ': bloco ambíguo/duplicado');
  return text.slice(0, i) + after + text.slice(i + before.length);
}
function replaceRange(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, label + ': intervalo não encontrado');
  assert(text.indexOf(startMarker, start + startMarker.length) < 0, label + ': início duplicado');
  return text.slice(0, start) + replacement + '\n\n' + text.slice(end);
}

let js = read('corponu-pagamentos-seguro.js');
assert(js.includes(OLD), 'Módulo de pagamentos não está na versão 274 esperada.');

const resolver = [
'  function localizarCadastroFaccaoPorId(id, faccoes) {',
'    const chave = String(id || "").trim();',
'    if (!chave) return null;',
'',
'    const encontrada = (faccoes || []).find(item => String(item?.id || "").trim() === chave) || null;',
'    if (!encontrada?.duplicadaDe) return encontrada;',
'',
'    return (faccoes || []).find(item => String(item?.id || "").trim() === String(encontrada.duplicadaDe || "").trim()) || encontrada;',
'  }',
'',
'  function localizarCadastroFaccao(nome, faccoes, faccaoId = "") {',
'    const chave = normalizarNome(nome);',
'    let faccao = localizarCadastroFaccaoPorId(faccaoId, faccoes);',
'',
'    // O ID do cadastro é soberano. Nome exato é somente compatibilidade para histórico antigo.',
'    if (!faccao) {',
'      const candidatas = (faccoes || [])',
'        .filter(item => chave && normalizarNome(item?.nome) === chave)',
'        .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));',
'      faccao = candidatas[0] || {};',
'    }',
'',
'    const observacoes = String(faccao?.observacoes || "");',
'    const titularObservacao = observacoes.match(/Titular\\s*PIX\\s*:\\s*([^|;\\n]+)/i)?.[1]?.trim() || "";',
'    return {',
'      id: String(faccao?.id || "").trim(),',
'      nome: String(faccao?.nome || nome || "SEM FACÇÃO").trim(),',
'      chavePix: String(faccao?.chavePix || faccao?.pix || faccao?.dadosPagamento?.pix || "").trim(),',
'      titularPix: String(faccao?.titularPix || faccao?.titular || faccao?.nomeTitularPix || faccao?.dadosPagamento?.titular || titularObservacao || "").trim(),',
'      cidade: String(faccao?.cidade || "").trim(),',
'      celular: String(faccao?.celular || faccao?.telefone || faccao?.whatsapp || "").trim(),',
'      observacoes',
'    };',
'  }',
'',
'  async function resolverIdentidadesFaccaoPagamentos(pagamentos, dados) {',
'    const resultado = new Map();',
'    const contexto = dados?.contexto || {};',
'    const firestore = contexto.firestore;',
'    const db = contexto.db;',
'',
'    const idsMovimentacao = [...new Set((pagamentos || [])',
'      .filter(item => !(item?.faccaoId || item?.destinoId || item?.faccaoCadastroId || item?.destinoFaccaoId))',
'      .map(item => String(item?.movimentacaoId || "").trim())',
'      .filter(Boolean))];',
'',
'    const movimentacoes = new Map();',
'    if (firestore && db && idsMovimentacao.length) {',
'      await Promise.all(idsMovimentacao.map(async id => {',
'        try {',
'          const snap = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));',
'          if (snap.exists()) movimentacoes.set(id, { id: snap.id, ...snap.data() });',
'        } catch (error) {',
'          console.warn("Não foi possível resolver a movimentação " + id + " para o relatório de pagamento.", error);',
'        }',
'      }));',
'    }',
'',
'    for (const item of pagamentos || []) {',
'      const movimento = movimentacoes.get(String(item?.movimentacaoId || "").trim()) || null;',
'      const faccaoId = String(',
'        item?.faccaoId ||',
'        item?.destinoId ||',
'        item?.faccaoCadastroId ||',
'        item?.destinoFaccaoId ||',
'        movimento?.destinoId ||',
'        ""',
'      ).trim();',
'      const nomePagamento = String(item?.faccao || movimento?.destino || "SEM FACÇÃO").trim() || "SEM FACÇÃO";',
'      const cadastro = localizarCadastroFaccao(nomePagamento, dados?.faccoes || [], faccaoId);',
'      const chave = cadastro.id',
'        ? "id:" + cadastro.id',
'        : "nome:" + (normalizarNome(nomePagamento) || "SEM FACCAO");',
'      resultado.set(String(item?.id || ""), { chave, cadastro, faccaoId });',
'    }',
'',
'    return resultado;',
'  }'
].join('\n');

js = replaceRange(
  js,
  '  function localizarCadastroFaccao(nome, faccoes) {',
  '  function agruparPorFaccao(pagamentos) {',
  resolver,
  'resolver cadastro de facção'
);

const oldCompleto = [
'      const grupos = new Map();',
'      for (const item of pagamentos) {',
'        const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";',
'        const chave = normalizarNome(nome);',
'        if (!grupos.has(chave)) grupos.set(chave, { nome, itens: [] });',
'        grupos.get(chave).itens.push(item);',
'      }',
'',
'      const secoes = [...grupos.values()]',
'        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))',
'        .map(grupo => {',
'          const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);'
].join('\n');

const newCompleto = [
'      const identidadesFaccao = await resolverIdentidadesFaccaoPagamentos(pagamentos, dados);',
'      const grupos = new Map();',
'      for (const item of pagamentos) {',
'        const resolvida = identidadesFaccao.get(String(item?.id || ""));',
'        const nome = String(resolvida?.cadastro?.nome || item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";',
'        const chave = resolvida?.chave || "nome:" + (normalizarNome(nome) || "SEM FACCAO");',
'        if (!grupos.has(chave)) grupos.set(chave, { nome, cadastro: resolvida?.cadastro || null, itens: [] });',
'        grupos.get(chave).itens.push(item);',
'      }',
'',
'      const secoes = [...grupos.values()]',
'        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))',
'        .map(grupo => {',
'          const cadastro = grupo.cadastro || localizarCadastroFaccao(grupo.nome, dados.faccoes);'
].join('\n');

js = replaceOnce(js, oldCompleto, newCompleto, 'relatório completo');

const oldSimplificado = [
'      const grupos = agruparPorFaccao(pagamentos).map(grupo => {',
'        const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);',
'        return {',
'          nome: cadastro.nome || grupo.nome,',
'          chavePix: cadastro.chavePix,',
'          valor: grupo.valor',
'        };',
'      });'
].join('\n');

const newSimplificado = [
'      const identidadesFaccao = await resolverIdentidadesFaccaoPagamentos(pagamentos, dados);',
'      const mapaGrupos = new Map();',
'      for (const item of pagamentos) {',
'        const resolvida = identidadesFaccao.get(String(item?.id || ""));',
'        const nome = String(resolvida?.cadastro?.nome || item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";',
'        const chave = resolvida?.chave || "nome:" + (normalizarNome(nome) || "SEM FACCAO");',
'        if (!mapaGrupos.has(chave)) {',
'          mapaGrupos.set(chave, {',
'            nome,',
'            chavePix: String(resolvida?.cadastro?.chavePix || "").trim(),',
'            valor: 0',
'          });',
'        }',
'        mapaGrupos.get(chave).valor += Number(item?.total || 0);',
'      }',
'      const grupos = [...mapaGrupos.values()].sort((a, b) =>',
'        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })',
'      );'
].join('\n');

js = replaceOnce(js, oldSimplificado, newSimplificado, 'relatório simplificado');
js = js.split(OLD).join(RELEASE);

assert(js.includes('function localizarCadastroFaccaoPorId(id, faccoes)'), 'Lookup por ID ausente.');
assert(js.includes('movimento?.destinoId'), 'destinoId da movimentação ausente.');
assert((js.match(/resolverIdentidadesFaccaoPagamentos\(pagamentos, dados\)/g) || []).length >= 2, 'Relatórios não usam o resolver comum.');
write('corponu-pagamentos-seguro.js', js);

for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let content = read(path);
  assert(content.includes(OLD), path + ': release 274 não encontrada.');
  content = content.split(OLD).join(RELEASE);
  write(path, content);
}

const notes = 'Produção. Corrige exclusivamente os dados cadastrais e PIX dos relatórios de Pagamentos. O filtro de lançamentos permanece inalterado. Para cada pagamento, o relatório usa primeiro um ID de facção já gravado; quando não houver, segue movimentacaoId até movimentacoesProducao e usa destinoId para localizar o cadastro exato da facção. Nome exato fica somente como compatibilidade para registros históricos sem vínculo. Relatório completo e simplificado compartilham a mesma identidade, impedindo CAMILA de receber PIX, titular, cidade ou telefone de CAMILA FIRMINO, CAMILA FURTADO ou outra facção. Somente movimentações únicas necessárias ao filtro atual são consultadas. Nenhum pagamento e nenhuma regra do Firebase foram alterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  assert(json.version === OLD, path + ': versão de origem inesperada.');
  json.version = RELEASE;
  json.updatedAt = '2026-08-31T15:58:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log('Correção PIX 275 aplicada com vínculo por destinoId.');
