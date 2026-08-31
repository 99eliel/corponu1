const fs = require('fs');

const OLD = '2026-08-31-pagamentos-faccao-exata-274';
const RELEASE = '2026-08-31-pagamentos-pix-destinoid-275';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, `${label}: bloco não encontrado.`);
  assert(text.indexOf(before, first + before.length) < 0, `${label}: bloco duplicado/ambíguo.`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let js = read('corponu-pagamentos-seguro.js');

js = js.split(OLD).join(RELEASE);

const oldLocalizar = `  function localizarCadastroFaccao(nome, faccoes) {
    const chave = normalizarNome(nome);

    // Dados financeiros nunca podem ser inferidos por correspondência parcial de nome.
    // Ex.: CAMILA não pode herdar PIX/telefone de CAMILA FIRMINO ou CAMILA FURTADO.
    // Mantemos apenas igualdade normalizada (acentos, caixa e espaços são ignorados).
    const candidatas = (faccoes || [])
      .filter(item => chave && normalizarNome(item?.nome) === chave)
      .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));

    const faccao = candidatas[0] || {};
    const observacoes = String(faccao?.observacoes || "");
    const titularObservacao = observacoes.match(/Titular\\s*PIX\\s*:\\s*([^|;\\n]+)/i)?.[1]?.trim() || "";
    return {
      nome: String(faccao?.nome || nome || "SEM FACÇÃO").trim(),
      chavePix: String(
        faccao?.chavePix ||
        faccao?.pix ||
        faccao?.dadosPagamento?.pix ||
        ""
      ).trim(),
      titularPix: String(
        faccao?.titularPix ||
        faccao?.titular ||
        faccao?.nomeTitularPix ||
        faccao?.dadosPagamento?.titular ||
        titularObservacao ||
        ""
      ).trim(),
      cidade: String(faccao?.cidade || "").trim(),
      celular: String(faccao?.celular || faccao?.telefone || faccao?.whatsapp || "").trim(),
      observacoes
    };
  }
`;

const newLocalizar = `  function localizarCadastroFaccaoPorId(id, faccoes) {
    const chave = String(id || "").trim();
    if (!chave) return null;

    const encontrada = (faccoes || []).find(item => String(item?.id || "").trim() === chave) || null;
    if (!encontrada?.duplicadaDe) return encontrada;

    return (faccoes || []).find(item => String(item?.id || "").trim() === String(encontrada.duplicadaDe || "").trim()) || encontrada;
  }

  function localizarCadastroFaccao(nome, faccoes, faccaoId = "") {
    const chave = normalizarNome(nome);
    let faccao = localizarCadastroFaccaoPorId(faccaoId, faccoes);

    // O ID do cadastro é soberano. Nome só existe como compatibilidade para histórico antigo.
    if (!faccao) {
      const candidatas = (faccoes || [])
        .filter(item => chave && normalizarNome(item?.nome) === chave)
        .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));
      faccao = candidatas[0] || {};
    }

    const observacoes = String(faccao?.observacoes || "");
    const titularObservacao = observacoes.match(/Titular\\s*PIX\\s*:\\s*([^|;\\n]+)/i)?.[1]?.trim() || "";
    return {
      id: String(faccao?.id || "").trim(),
      nome: String(faccao?.nome || nome || "SEM FACÇÃO").trim(),
      chavePix: String(
        faccao?.chavePix ||
        faccao?.pix ||
        faccao?.dadosPagamento?.pix ||
        ""
      ).trim(),
      titularPix: String(
        faccao?.titularPix ||
        faccao?.titular ||
        faccao?.nomeTitularPix ||
        faccao?.dadosPagamento?.titular ||
        titularObservacao ||
        ""
      ).trim(),
      cidade: String(faccao?.cidade || "").trim(),
      celular: String(faccao?.celular || faccao?.telefone || faccao?.whatsapp || "").trim(),
      observacoes
    };
  }

  async function resolverIdentidadesFaccaoPagamentos(pagamentos, dados) {
    const resultado = new Map();
    const { firestore, db } = dados?.contexto || {};
    const idsMovimentacao = [...new Set((pagamentos || [])
      .filter(item => !(item?.faccaoId || item?.destinoId || item?.faccaoCadastroId || item?.destinoFaccaoId))
      .map(item => String(item?.movimentacaoId || "").trim())
      .filter(Boolean))];

    const movimentacoes = new Map();
    if (firestore && db && idsMovimentacao.length) {
      await Promise.all(idsMovimentacao.map(async id => {
        try {
          const snap = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));
          if (snap.exists()) movimentacoes.set(id, { id: snap.id, ...snap.data() });
        } catch (error) {
          console.warn(`Não foi possível resolver a movimentação ${id} para o relatório de pagamento.`, error);
        }
      }));
    }

    for (const item of pagamentos || []) {
      const movimento = movimentacoes.get(String(item?.movimentacaoId || "").trim()) || null;
      const faccaoId = String(
        item?.faccaoId ||
        item?.destinoId ||
        item?.faccaoCadastroId ||
        item?.destinoFaccaoId ||
        movimento?.destinoId ||
        ""
      ).trim();
      const nomePagamento = String(item?.faccao || movimento?.destino || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const cadastro = localizarCadastroFaccao(nomePagamento, dados?.faccoes || [], faccaoId);
      const chave = cadastro.id
        ? `id:${cadastro.id}`
        : `nome:${normalizarNome(nomePagamento) || "SEM FACCAO"}`;
      resultado.set(String(item?.id || ""), { chave, cadastro, faccaoId });
    }

    return resultado;
  }
`;

js = replaceOnce(js, oldLocalizar, newLocalizar, 'resolução cadastral da facção');

const oldGrupoCompleto = `      const grupos = new Map();
      for (const item of pagamentos) {
        const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
        const chave = normalizarNome(nome);
        if (!grupos.has(chave)) grupos.set(chave, { nome, itens: [] });
        grupos.get(chave).itens.push(item);
      }

      const secoes = [...grupos.values()]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .map(grupo => {
          const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);`;

const newGrupoCompleto = `      const identidadesFaccao = await resolverIdentidadesFaccaoPagamentos(pagamentos, dados);
      const grupos = new Map();
      for (const item of pagamentos) {
        const resolvida = identidadesFaccao.get(String(item?.id || ""));
        const nome = String(resolvida?.cadastro?.nome || item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
        const chave = resolvida?.chave || `nome:${normalizarNome(nome) || "SEM FACCAO"}`;
        if (!grupos.has(chave)) grupos.set(chave, { nome, cadastro: resolvida?.cadastro || null, itens: [] });
        grupos.get(chave).itens.push(item);
      }

      const secoes = [...grupos.values()]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .map(grupo => {
          const cadastro = grupo.cadastro || localizarCadastroFaccao(grupo.nome, dados.faccoes);`;

js = replaceOnce(js, oldGrupoCompleto, newGrupoCompleto, 'agrupamento do relatório completo');

const oldSimplificado = `      const grupos = agruparPorFaccao(pagamentos).map(grupo => {
        const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);
        return {
          nome: cadastro.nome || grupo.nome,
          chavePix: cadastro.chavePix,
          valor: grupo.valor
        };
      });`;

const newSimplificado = `      const identidadesFaccao = await resolverIdentidadesFaccaoPagamentos(pagamentos, dados);
      const mapaGrupos = new Map();
      for (const item of pagamentos) {
        const resolvida = identidadesFaccao.get(String(item?.id || ""));
        const nome = String(resolvida?.cadastro?.nome || item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
        const chave = resolvida?.chave || `nome:${normalizarNome(nome) || "SEM FACCAO"}`;
        if (!mapaGrupos.has(chave)) {
          mapaGrupos.set(chave, {
            nome,
            chavePix: String(resolvida?.cadastro?.chavePix || "").trim(),
            valor: 0
          });
        }
        mapaGrupos.get(chave).valor += Number(item?.total || 0);
      }
      const grupos = [...mapaGrupos.values()].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );`;

js = replaceOnce(js, oldSimplificado, newSimplificado, 'agrupamento do relatório simplificado');

assert(js.includes('resolverIdentidadesFaccaoPagamentos(pagamentos, dados)'), 'resolver por movimentação não foi instalado.');
assert(js.includes('movimento?.destinoId'), 'destinoId da movimentação não está sendo usado.');
assert(js.includes('localizarCadastroFaccaoPorId'), 'lookup exato por ID não foi instalado.');
write('corponu-pagamentos-seguro.js', js);

for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let content = read(path);
  const count = content.split(OLD).length - 1;
  assert(count >= 1, `${path}: release 274 não encontrada.`);
  content = content.split(OLD).join(RELEASE);
  write(path, content);
}

const notes = 'Produção. Corrige exclusivamente os dados cadastrais e PIX exibidos nos relatórios de Pagamentos. A facção do lançamento continua sendo filtrada como antes, mas o relatório deixa de resolver os dados bancários apenas pelo texto do nome. Para cada pagamento, o sistema usa primeiro um ID de facção já gravado quando existir; caso contrário, usa movimentacaoId para ler a movimentação correspondente e obter destinoId. Esse destinoId aponta para o cadastro exato da facção, que fornece nome, PIX, titular, cidade e telefone. O nome passa a ser somente fallback para registros históricos sem vínculo. O relatório completo e o simplificado usam a mesma identidade, impedindo CAMILA de receber dados de CAMILA FIRMINO, CAMILA FURTADO ou outra facção. As leituras adicionais são somente das movimentações únicas necessárias aos pagamentos filtrados, não da coleção inteira. Nenhum lançamento e nenhuma regra do Firebase foram alterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  json.version = RELEASE;
  json.updatedAt = '2026-08-31T15:55:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log(`Relatório PIX corrigido por identidade real: ${RELEASE}`);
