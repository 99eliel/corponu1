from pathlib import Path
import json
import re

VERSION = "2026-07-30-rastreamento-bipar-manejo-13"
UPDATED_AT = "2026-07-30T10:58:00-03:00"

app_path = Path("app.js")
sw_path = Path("sw.js")
atualizador_path = Path("corponu-atualizador.js")
release_path = Path("corponu-release.json")

app = app_path.read_text(encoding="utf-8")

funcoes_novas = r'''
const ordensEmBipadoDireto = new Set();
const ordensEnviandoManejoDireto = new Set();
const FASE_MANEJO_AGUARDANDO_MOVIMENTACAO = "AGUARDANDO MOVIMENTAÇÃO";

async function enviarOrdemParaManejoDireto(opId) {
  const id = String(opId || "").trim();
  if (!id || ordensEnviandoManejoDireto.has(id)) return;

  const ordem = state.ordens.find(item => String(item.id) === id);
  if (!ordem) {
    toast("OP não encontrada no Rastreamento.");
    return;
  }

  ordensEnviandoManejoDireto.add(id);
  try {
    const setor = getTipoPecaManejoOP(ordem);
    const infoSetor = getInfoManejoSetor(setor);
    const manejoExistente = getManejoDaOrdem(ordem, setor) || {};

    const manejo = {
      ...manejoExistente,
      setor,
      setorLabel: infoSetor.label,
      fase: FASE_MANEJO_AGUARDANDO_MOVIMENTACAO,
      faccao: "",
      chegada: "",
      falta: 0,
      celu: "",
      status: "organizada",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    };

    if (!manejoExistente?.criadoEm) {
      manejo.criadoPor = state.currentUser.uid;
      manejo.criadoEm = serverTimestamp();
    }

    const patch = montarPatchManejoSetor(setor, manejo, "organizada", {
      ocultarDoManejo: false,
      localAtualMigracao: "MANEJO_AGUARDANDO_DESTINO",
      statusMigracaoLigia: "MANEJO_ABERTO_AGUARDANDO_DESTINO",
      relatorioMigracao: "Manejo / aguardando movimentação",
      ajusteManualMigracao: true,
      destinoAtualMigracao: "MANEJO",
      processoAtualMigracao: FASE_MANEJO_AGUARDANDO_MOVIMENTACAO,
      proximoDestinoMigracao: "",
      dataEnvioAtualMigracao: "",
      dataChegadaAtualMigracao: "",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "ordensProducao", id), patch, { merge: true });

    await registrarLog(
      "op_enviada_manejo_pelo_rastreamento",
      "ordemProducao",
      id,
      `OP ${ordem.numeroOP || ordem.numeroOPExterno || id} | enviada ao Manejo ${infoSetor.label} | fase ${FASE_MANEJO_AGUARDANDO_MOVIMENTACAO}`
    );

    toast(`OP ${ordem.numeroOP || ordem.numeroOPExterno || id} enviada para o Manejo com a fase ${FASE_MANEJO_AGUARDANDO_MOVIMENTACAO}.`);
  } catch (error) {
    console.error("Erro ao enviar OP para o Manejo pelo Rastreamento.", error);
    toast(error?.code === "permission-denied"
      ? "Seu usuário não possui permissão para enviar esta OP ao Manejo."
      : "Erro ao enviar a OP para o Manejo.");
  } finally {
    ordensEnviandoManejoDireto.delete(id);
  }
}

async function biparOrdemDireto(opId) {
  const id = String(opId || "").trim();
  if (!id || ordensEmBipadoDireto.has(id)) return;

  const ordem = state.ordens.find(item => String(item.id) === id);
  if (!ordem) {
    toast("OP não encontrada no Rastreamento.");
    return;
  }

  ordensEmBipadoDireto.add(id);
  try {
    const hoje = getDataHojeISO();
    const movimentacoesAbertas = state.movimentacoesProducao
      .filter(mov => {
        if (String(mov.opId || "") !== id) return false;
        return !["finalizado", "encaminhado"].includes(String(mov.status || "em_andamento"));
      })
      .sort((a, b) => getMovTimestamp(b) - getMovTimestamp(a));

    const movimentacaoPrincipal = movimentacoesAbertas[0] || null;
    const quantidade = Math.max(0, Number(
      movimentacaoPrincipal?.quantidadeRecebida ||
      movimentacaoPrincipal?.quantidadeEnviada ||
      ordem.quantidade ||
      ordem.quantidadeTotal ||
      0
    ));
    const processo = limparTexto(
      movimentacaoPrincipal?.processo ||
      ordem.processoAtualMigracao ||
      ordem.faseOriginalLigia ||
      "FINALIZAÇÃO"
    ).toUpperCase() || "FINALIZAÇÃO";
    const movimentacaoId = movimentacaoPrincipal?.id || docIdSeguro(`bipado-direto-${id}`);
    const numeroOP = ordem.numeroOP || ordem.numeroOPExterno || id;

    const lote = writeBatch(db);

    if (movimentacaoPrincipal) {
      lote.set(doc(db, "movimentacoesProducao", movimentacaoId), {
        status: "finalizado",
        bipado: true,
        bipadoInternamente: true,
        origemBipado: "rastreamento_direto_op",
        encerradoAutomaticamente: true,
        bipadoPor: state.currentUser.uid,
        bipadoEm: serverTimestamp(),
        atualizadoPor: state.currentUser.uid,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    } else {
      lote.set(doc(db, "movimentacoesProducao", movimentacaoId), {
        id: movimentacaoId,
        origem: "rastreamento_bipado_direto",
        origemManual: true,
        opId: id,
        numeroOP,
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
      }, { merge: true });
    }

    movimentacoesAbertas.slice(1).forEach(mov => {
      lote.set(doc(db, "movimentacoesProducao", String(mov.id)), {
        status: "encaminhado",
        encaminhado: true,
        encaminhadoParaTipo: "finalizado",
        encaminhadoParaLabel: "Finalizado / bipado",
        encaminhadoParaDestino: "FINALIZADO / BIPADO",
        movimentacaoDestinoId: movimentacaoId,
        encerradoAutomaticamente: true,
        encerradoPorBipadoDireto: true,
        atualizadoPor: state.currentUser.uid,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    });

    lote.set(doc(db, "ordensProducao", id), {
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

    await lote.commit();

    await registrarLog(
      "op_bipada_direto_rastreamento",
      "movimentacaoProducao",
      movimentacaoId,
      `OP ${numeroOP} | bipada diretamente no Rastreamento | ${quantidade} peças | ${movimentacoesAbertas.length} movimentação(ões) aberta(s) encerrada(s)`
    );

    toast(`OP ${numeroOP} bipada e enviada para o relatório de bipadas.`);
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
    app = app.replace(marcador_funcao, funcoes_novas + marcador_funcao, 1)

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
  const jaPossuiBipadoReal = /finalizado|bipado/i.test(`${local.local || ""} ${local.status || ""}`);
  const botaoBipar = !jaPossuiBipadoReal
    ? `<button class="btn btn-sm btn-bipado" data-bipar-op-direto="${escapeHtml(op.id)}" onclick="biparOrdemDireto('${op.id}')">Bipar</button>`
    : `<span class="badge ok">Bipado ✓</span>`;
  const botaoManejo = `<button class="btn btn-sm" data-enviar-manejo-direto="${escapeHtml(op.id)}" onclick="enviarOrdemParaManejoDireto('${op.id}')">Enviar para manejo</button>`;
  const acoes = ehAdmin()
    ? `${botaoBipar}
       ${botaoManejo}
       <button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('${op.id}')">Editar local</button>
       <button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`
    : `${botaoBipar}
       ${botaoManejo}
       <button class="btn btn-sm" onclick="filtrarManejosPorOP('${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>`;

  return `
'''

if bloco_novo not in app:
    if bloco_antigo not in app:
        raise SystemExit("Bloco original das ações do Rastreamento não encontrado.")
    app = app.replace(bloco_antigo, bloco_novo, 1)

export_antigo = "window.biparMovimentacao = biparMovimentacao;\nwindow.finalizarMovimentacao = finalizarMovimentacao;"
export_novo = "window.biparMovimentacao = biparMovimentacao;\nwindow.biparOrdemDireto = biparOrdemDireto;\nwindow.enviarOrdemParaManejoDireto = enviarOrdemParaManejoDireto;\nwindow.finalizarMovimentacao = finalizarMovimentacao;"
if export_novo not in app:
    if export_antigo not in app:
        raise SystemExit("Marcador de exportação do Rastreamento não encontrado.")
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
    "notes": "Adiciona no Rastreamento o botão Enviar para manejo, que recoloca a OP no manejo correto de Sutiã ou Calcinha com a fase AGUARDANDO MOVIMENTAÇÃO. Mantém também o bipado direto mesmo com movimentações abertas."
}
release_path.write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

Path("LEIA-ME-RASTREAMENTO-BIPAR-E-MANEJO.txt").write_text(
    "CORPONU - RASTREAMENTO: BIPAR E ENVIAR PARA MANEJO\n\n"
    "Envie juntos para a raiz do repositorio:\n"
    "- app.js\n"
    "- sw.js\n"
    "- corponu-atualizador.js\n"
    "- corponu-release.json\n\n"
    "NOVO BOTAO ENVIAR PARA MANEJO\n"
    "- Aparece ao pesquisar uma OP no Rastreamento.\n"
    "- Identifica automaticamente se a OP pertence ao manejo Sutia ou Calcinha.\n"
    "- Recoloca a OP no manejo com a fase AGUARDANDO MOVIMENTACAO.\n"
    "- Limpa somente os campos de novo destino do manejo: faccao, chegada, falta e celu.\n"
    "- Preserva silk, tecido, necessidade, dados da OP e historico de movimentacoes.\n"
    "- Nao registra chegada, nao altera movimentacoes existentes e nao gera pagamento.\n\n"
    "BIPAR DIRETO\n"
    "- Continua funcionando mesmo com movimentacao aberta.\n"
    "- Nao abre Editar local e nao solicita chegada.\n"
    "- As gravacoes do bipado permanecem atomicas.\n",
    encoding="utf-8"
)

print(f"Pacote gerado: {VERSION}")
