from pathlib import Path
import json
from datetime import datetime, timezone, timedelta


def trocar(path, antigo, novo, descricao):
    p = Path(path)
    texto = p.read_text(encoding="utf-8")
    qtd = texto.count(antigo)
    if qtd != 1:
        raise SystemExit(f"ERRO {descricao}: esperado 1 trecho, encontrados {qtd}.")
    p.write_text(texto.replace(antigo, novo, 1), encoding="utf-8")


trocar(
    "corponu-atualizador.js",
    'const LOCAL_RELEASE = "2026-08-25-pagamentos-lazy-loader-250";',
    'const LOCAL_RELEASE = "2026-08-25-manejo-calcinha-dedicado-252";',
    "versão do atualizador",
)

bloco_antigo = '''    ["corponu-calcinha-planejamento-opcional-129.js", "calcinha-planejamento-opcional-129", "Não foi possível tornar serviço e facção opcionais nas OPs de calcinha."],
    ["corponu-manejo-calcinha-estavel-204.js", "manejo-calcinha-estavel-204", "Não foi possível carregar a estabilização do Manejo Calcinha."],
    ["corponu-manejo-calcinha-fase-definitivo-216.js", "manejo-calcinha-fase-lista-real-219", "Não foi possível carregar a lista de Fase da Calcinha."],
    ["corponu-manejo-calcinha-antipisca-231.js", "manejo-calcinha-antipisca-231", "Não foi possível carregar a proteção visual da Fase da Calcinha."]'''

bloco_novo = '''    ["corponu-calcinha-planejamento-opcional-129.js", "calcinha-planejamento-opcional-129", "Não foi possível tornar serviço e facção opcionais nas OPs de calcinha."],
    ["corponu-dual-ready-bridge.js", "dual-ready-bridge", "Não foi possível sincronizar o carregamento do modo Sutiã/Calcinha."],
    ["corponu-manejo-calcinha-dedicado-252.js", "manejo-calcinha-dedicado-252", "Não foi possível carregar o Manejo Calcinha dedicado."]'''

trocar("corponu-atualizador.js", bloco_antigo, bloco_novo, "pacote do Manejo Calcinha")

trocar(
    "corponu-dual-mode.js",
    '''  function getCurrentPage() {
    return document.querySelector(".page.active")?.id || "manejo";
  }

  function isAdmin() {''',
    '''  function getCurrentPage() {
    return document.querySelector(".page.active")?.id || "manejo";
  }

  function dedicatedCalcinhaActive() {
    return document.body?.dataset?.corponuCalcinhaDedicado === "1"
      && document.querySelector("#manejo .manejo-setor-btn.active")?.dataset?.setor === "calcinha";
  }

  function isAdmin() {''',
    "helper de tela dedicada",
)

trocar(
    "corponu-dual-mode.js",
    '      if (pageId === "manejo") { injectManejoLineColumn(); applyManejoTypeLayout(); }',
    '      if (pageId === "manejo" && !dedicatedCalcinhaActive()) { injectManejoLineColumn(); applyManejoTypeLayout(); }',
    "applyPage do Manejo",
)

trocar(
    "corponu-dual-mode.js",
    '''    wrapEditFunctions();
    wrapManejoSave();
    wrapSendToFaction();
    injectManejoLineColumn();
    applyManejoTypeLayout();''',
    '''    wrapEditFunctions();
    wrapManejoSave();
    wrapSendToFaction();
    if (!dedicatedCalcinhaActive()) {
      injectManejoLineColumn();
      applyManejoTypeLayout();
    }''',
    "applyAll do Manejo",
)

trocar(
    "corponu-dual-mode.js",
    '          if (id === "listaManejoInline") { injectManejoLineColumn(); applyManejoTypeLayout(); }',
    '''          if (id === "listaManejoInline") {
            if (dedicatedCalcinhaActive()) return;
            injectManejoLineColumn();
            applyManejoTypeLayout();
          }''',
    "observer da tabela antiga",
)

trocar(
    "corponu-dual-mode.js",
    '''    const pageObserver = new MutationObserver(() => {
      const page = getCurrentPage();''',
    '''    const pageObserver = new MutationObserver(records => {
      if (dedicatedCalcinhaActive() && records.every(record => record.target instanceof Element && record.target.closest?.("#corponuManejoCalcinhaDedicado252"))) return;
      const page = getCurrentPage();''',
    "observer geral do Dual Mode",
)

release = Path("corponu-release.json")
dados = json.loads(release.read_text(encoding="utf-8"))
dados["version"] = "2026-08-25-manejo-calcinha-dedicado-252"
dados["updatedAt"] = datetime.now(timezone(timedelta(hours=-3))).isoformat(timespec="seconds")
dados["notes"] = (
    "PRODUÇÃO. Manejo Calcinha passa a usar uma tela própria e otimizada, separada da tabela genérica do Sutiã. "
    "Linha, Fase e Necessidade são editadas na área dedicada e salvas juntas em uma única atualização da OP. "
    "A lista usa as OPs já carregadas pelo Dual Mode e renderiza até 80 registros por vez. "
    "Os adaptadores antigos 204, 216 e 231 deixam de ser carregados. O Dual Mode ignora a tabela genérica escondida enquanto Calcinha estiver ativa. "
    "O envio para facção continua reutilizando o fluxo existente. Não altera app.js, Pagamentos, regras Firebase, dados históricos nem o fluxo do Sutiã Completo 251."
)
release.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
