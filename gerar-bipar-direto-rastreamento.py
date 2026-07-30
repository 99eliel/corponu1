from pathlib import Path
import json
import re

VERSION = "2026-07-30-rastreamento-bipar-direto-11"
UPDATED_AT = "2026-07-30T08:28:00-03:00"

app_path = Path("app.js")
sw_path = Path("sw.js")
atualizador_path = Path("corponu-atualizador.js")
release_path = Path("corponu-release.json")

app = app_path.read_text(encoding="utf-8")

funcao_nova = r'''
const ordensEmBipadoDireto = new Set();

async function biparOrdemDireto(opId) {
  const id = String(opId || "").trim();
  if (!id || ordensEmBipadoDireto.has(id)) return;

  const ordem = state.ordens.find(item => String(item.id) === id);
  if (!ordem) {
    toast("OP não encontrada no Rastreamento.");
    return;
  }

  const localSalvo = normalizarTexto([
    ordem.localAtualMigracao,
    ordem.statusMigracaoLigia,
    ordem.destinoAtualMigracao
  ].join(" ")).toUpperCase();

  const faccaoEmAberto = state.movimentacoesProducao.some(mov => {
    if (String(mov.opId || "") !== id) return false;
    if (normalizarTexto(mov.tipoDestino || "") !== "faccao") return false;
    return !["finalizado", "encaminhado"].includes(String(mov.status || "em_andamento"));
  });

  if (faccaoEmAberto || localSalvo.includes("EM_FACCAO") || localSalvo.includes("AGUARDANDO_CHEGADA")) {
    toast("Esta OP está vinculada a uma facção. Finalize pela aba Facções.");
    return;
  }

  ordensEmBipadoDireto.add(id);
  try {
    const hoje = getDataHojeISO();
    const quantidade = Math.max(0, Number(ordem.quantidade || ordem.quantidadeTotal || 0));
    const processo = limparTexto(
      ordem.processoAtualMigracao ||
      ordem.faseOriginalLigia ||
      "FINALIZAÇÃO"
    ).toUpperCase() || "FINALIZAÇÃO";
    const movimentacaoId = docIdSeguro(`bipado-direto-${id}`);

    const movimentacao = {
      id: movimentacaoId,
      origem: "rastreamento_bipado_direto",
      origemManual: true,
      opId: id,
      numeroOP: ordem.numeroOP || ordem.numeroOPExterno || id,
      referencia: ordem.referencia || "",
      cor: ordem.cor || "",
      produtoNome: ordem.produtoNome || ordem.nomeProduto || "",
      setor: getSetorPrincipalOrdem(ordem),
      tipoDestino: "interno",
      tipoDestinoLabel: "Interno",
      destino: "FINALIZADO / BIPADO",
      processo,
      quantidadeEnviada: quantidade,
      quantidadeRecebida: quantidade,
      dataEnvio: ordem.dataEnvioAtualMigracao || ordem.dataOriginalLigia || "",
      dataChegada: hoje,
      falta: 0,
      descontoDefeito: 0,
      defeito: 0,
      status: "finalizado",
      bipado: true,
      bipadoInternamente: true,
      origemBipado: "rastreamento_direto_op",
      bipadoPor: state.currentUser.uid,
      bipadoEm: serverTimestamp(),
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp(),
      criadoPor: state.currentUser.uid,
      criadoEm: serverTimestamp()
    };

    await setDoc(doc(db, "movimentacoesProducao", movimentacaoId), movimentacao, { merge: true });
    await setDoc(doc(db, "ordens", id), {
      localAtualMigracao: "FINALIZADO_BIPADO",
      statusMigracaoLigia: "FINALIZADO_BIPADO",
      relatorioMigracao: "Finalizado / bipado",
      ajusteManualMigracao: true,
      ocultarDoManejo: true,
      destinoAtualMigracao: "FINALIZADO / BIPADO",
      processoAtualMigracao: processo,
      dataChegadaAtualMigracao: hoje,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog(
      "op_bipada_direto_rastreamento",
      "movimentacaoProducao",
      movimentacaoId,
      `OP ${movimentacao.numeroOP} | bipada diretamente no Rastreamento | ${quantidade} peças`
    );

    toast(`OP ${movimentacao.numeroOP} bipada e enviada para o relatório de bipadas.`);
  } catch (error) {
    console.error("Erro ao bipar OP diretamente pelo Rastreamento.", error);
    toast(error?.code === "permission-denied"
      ? "Seu usuário não possui permissão para bipar esta OP."
      : "Erro ao bipar a OP pelo Rastreamento.");
  } finally {
    ordensEmBipadoDireto.delete(id);
  }
}

'''

marcador_funcao = "function renderLinhaRastreamentoGlobalOP(op) {"
if "async function biparOrdemDireto(opId)" not in app:
    if marcador_funcao not in app:
        raise SystemExit("Marcador renderLinhaRastreamentoGlobalOP não encontrado.")
    app = app.replace(marcador_funcao, funcao_nova + marcador_funcao, 1)

bloco_antigo = '''function renderLinhaRastreamentoGlobalOP(op) {
  const local = getLocalizacaoAtualOrdem(op);
  const quantidade = Number(op?.quantidade || 0);
  const acoes = ehAdmin()
    ? `<button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('${op.id}')">Editar local</button>
       <button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`
    : `<button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`;

  return `
'''

bloco_novo = '''function renderLinhaRastreamentoGlobalOP(op) {
  const local = getLocalizacaoAtualOrdem(op);
  const quantidade = Number(op?.quantidade || 0);
  const localEhFaccao = /facção|faccao/i.test(`${local.tipo || ""} ${local.local || ""}`);
  const jaPossuiBipadoReal = state.movimentacoesProducao.some(mov =>
    String(mov.opId || "") === String(op.id) && String(mov.status || "") === "finalizado"
  );
  const botaoBipar = !localEhFaccao && !jaPossuiBipadoReal
    ? `<button class="btn btn-sm btn-bipado" data-bipar-op-direto="${escapeHtml(op.id)}" onclick="biparOrdemDireto('${op.id}')">Bipar</button>`
    : jaPossuiBipadoReal
      ? `<span class="badge ok">Bipado ✓</span>`
      : "";
  const acoes = ehAdmin()
    ? `${botaoBipar}
       <button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('${op.id}')">Editar local</button>
       <button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`
    : `${botaoBipar}
       <button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`;

  return `
'''

if bloco_novo not in app:
    if bloco_antigo not in app:
        raise SystemExit("Bloco original das ações do Rastreamento não encontrado.")
    app = app.replace(bloco_antigo, bloco_novo, 1)

export_antigo = "window.biparMovimentacao = biparMovimentacao;\nwindow.finalizarMovimentacao = finalizarMovimentacao;"
export_novo = "window.biparMovimentacao = biparMovimentacao;\nwindow.biparOrdemDireto = biparOrdemDireto;\nwindow.finalizarMovimentacao = finalizarMovimentacao;"
if export_novo not in app:
    if export_antigo not in app:
        raise SystemExit("Marcador de exportação do bipado não encontrado.")
    app = app.replace(export_antigo, export_novo, 1)

app_path.write_text(app, encoding="utf-8")

sw = sw_path.read_text(encoding="utf-8")
sw, total_sw = re.subn(r'const APP_VERSION = "[^"]+";', f'const APP_VERSION = "{VERSION}";', sw, count=1)
if total_sw != 1:
    raise SystemExit("Não foi possível atualizar a versão do sw.js.")
sw_path.write_text(sw, encoding="utf-8")

atualizador = atualizador_path.read_text(encoding="utf-8")
atualizador, total_atualizador = re.subn(r'const LOCAL_RELEASE = "[^"]+";', f'const LOCAL_RELEASE = "{VERSION}";', atualizador, count=1)
if total_atualizador != 1:
    raise SystemExit("Não foi possível atualizar o corponu-atualizador.js.")
atualizador_path.write_text(atualizador, encoding="utf-8")

release = {
    "version": VERSION,
    "updatedAt": UPDATED_AT,
    "notes": "Adiciona o botão Bipar diretamente no resultado da busca do Rastreamento. A OP é finalizada e enviada ao relatório de bipadas automaticamente, sem abrir Editar local ou exigir chegada. Operações de facção permanecem bloqueadas e exclusivas da aba Facções."
}
release_path.write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

Path("LEIA-ME-BIPAR-DIRETO-RASTREAMENTO.txt").write_text(
    "CORPONU - BIPAR DIRETO NO RASTREAMENTO\n\n"
    "Envie juntos para a raiz do repositorio:\n"
    "- app.js\n"
    "- sw.js\n"
    "- corponu-atualizador.js\n"
    "- corponu-release.json\n\n"
    "O botao Bipar passa a aparecer ao pesquisar uma OP no Rastreamento.\n"
    "Ao clicar, a OP e finalizada automaticamente e entra no relatorio de bipadas.\n"
    "Nao abre Editar local e nao solicita chegada.\n"
    "OPs ainda vinculadas a faccao continuam bloqueadas e devem ser finalizadas na aba Faccoes.\n"
    "O ID do movimento e fixo por OP para impedir duplicidade em clique repetido.\n",
    encoding="utf-8"
)

print(f"Pacote gerado: {VERSION}")
