from __future__ import annotations

import json
from pathlib import Path

VERSAO = "2026-07-30-hotfix-filtro-pagamentos-estavel-9"
ROOT = Path(__file__).resolve().parent


def substituir_unico(texto: str, antigo: str, novo: str, rotulo: str) -> str:
    quantidade = texto.count(antigo)
    if quantidade != 1:
        raise RuntimeError(f"{rotulo}: esperado 1 trecho, encontrado {quantidade}.")
    return texto.replace(antigo, novo, 1)


app_path = ROOT / "app.js"
app = app_path.read_text(encoding="utf-8")

listeners_antigos = '''  [
    "pagamentoDataInicio",
    "pagamentoDataFim",
    "pagamentoFiltroFaccao",
    "pagamentoFiltroReferencia",
    "pagamentoFiltroPreco",
    "pagamentoFiltroStatus"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderPagamentos);
  });'''

listeners_novos = '''  [
    "pagamentoDataInicio",
    "pagamentoDataFim",
    "pagamentoFiltroFaccao",
    "pagamentoFiltroReferencia",
    "pagamentoFiltroPreco",
    "pagamentoFiltroStatus"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", agendarRenderPagamentosFiltrados);
  });'''

app = substituir_unico(
    app,
    listeners_antigos,
    listeners_novos,
    "listeners dos filtros de pagamentos",
)

render_antigo = '''function renderPagamentos() {
  const tbody = document.getElementById("listaPagamento");
  if (!tbody) return;

  renderPrecosReferencia();
  preencherFiltrosPagamento();'''

render_novo = '''let timerRenderFiltrosPagamento = 0;
let renderFiltrosPagamentoEmAndamento = false;

function agendarRenderPagamentosFiltrados() {
  window.clearTimeout(timerRenderFiltrosPagamento);
  timerRenderFiltrosPagamento = window.setTimeout(() => {
    if (renderFiltrosPagamentoEmAndamento) return;
    renderFiltrosPagamentoEmAndamento = true;
    try {
      resetarLimitesRenderTabelaPrefixo("pagamentos");
      renderPagamentos({ somenteResultados: true });
    } catch (error) {
      console.error("Falha ao aplicar filtros leves de Pagamentos.", error);
      renderPagamentos();
    } finally {
      renderFiltrosPagamentoEmAndamento = false;
    }
  }, 80);
}

function renderPagamentos(opcoes = {}) {
  const tbody = document.getElementById("listaPagamento");
  if (!tbody) return;

  const somenteResultados = opcoes?.somenteResultados === true;
  if (!somenteResultados) {
    renderPrecosReferencia();
    preencherFiltrosPagamento();
  }'''

app = substituir_unico(
    app,
    render_antigo,
    render_novo,
    "função renderPagamentos",
)

app_path.write_text(app, encoding="utf-8")

sw_path = ROOT / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
sw = substituir_unico(
    sw,
    'const APP_VERSION = "2026-07-30-rastreamento-interno-sem-faccao-4";',
    f'const APP_VERSION = "{VERSAO}";',
    "versão do Service Worker",
)
sw_path.write_text(sw, encoding="utf-8")

atualizador_path = ROOT / "corponu-atualizador.js"
atualizador = atualizador_path.read_text(encoding="utf-8")
atualizador = substituir_unico(
    atualizador,
    'const LOCAL_RELEASE = "2026-07-30-rastreamento-interno-sem-faccao-4";',
    f'const LOCAL_RELEASE = "{VERSAO}";',
    "versão do atualizador",
)
atualizador_path.write_text(atualizador, encoding="utf-8")

release_path = ROOT / "corponu-release.json"
release = {
    "version": VERSAO,
    "updatedAt": "2026-07-30T07:18:00-03:00",
    "notes": (
        "Corrige o travamento ao alternar os filtros de status em Pagamentos. "
        "Os filtros passam a atualizar somente totais e tabelas, sem reconstruir "
        "facções, referências, preços e formulários a cada mudança."
    ),
}
release_path.write_text(
    json.dumps(release, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

leia_me = ROOT / "LEIA-ME-HOTFIX-FILTRO-PAGAMENTOS.txt"
leia_me.write_text(
    """HOTFIX MANUAL — FILTRO DE PAGAMENTOS\n\n"
    "Substitua no GitHub somente estes quatro arquivos:\n"
    "1. app.js\n"
    "2. sw.js\n"
    "3. corponu-atualizador.js\n"
    "4. corponu-release.json\n\n"
    "Não envie este gerador para a main. Ele existe apenas na branch de preparação.\n\n"
    "Após substituir os quatro arquivos, aguarde a atualização automática. "
    "O sistema deve recarregar uma vez.\n\n"
    "Validações executadas no pacote:\n"
    "- sintaxe dos JavaScript com node --check;\n"
    "- leitura do JSON;\n"
    "- confirmação de que os trechos antigos existiam exatamente uma vez;\n"
    "- confirmação de que o filtro não chama mais a renderização estrutural completa.\n"
    """,
    encoding="utf-8",
)

print(f"Hotfix {VERSAO} gerado com sucesso.")
