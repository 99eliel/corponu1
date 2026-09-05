from pathlib import Path
import json

OLD_VERSION = "2026-07-30-hotfix-filtro-pagamentos-estavel-9"
NEW_VERSION = "2026-07-30-remover-filtro-status-pagamentos-10"
UPDATED_AT = "2026-07-30T07:30:00-03:00"


def replace_once(path: str, old: str, new: str) -> None:
    arquivo = Path(path)
    texto = arquivo.read_text(encoding="utf-8")
    ocorrencias = texto.count(old)
    if ocorrencias != 1:
        raise RuntimeError(f"{path}: esperado 1 trecho, encontrado {ocorrencias}")
    arquivo.write_text(texto.replace(old, new, 1), encoding="utf-8")


# 1) Remove somente o controle visível, preservando o ID como campo oculto.
# Isso evita quebrar rotinas antigas que ainda consultam o elemento.
replace_once(
    "index.html",
    '''            <label>
              Pagamento
              <select id="pagamentoFiltroStatus">
                <option value="pendente" selected>Pendentes</option>
                <option value="pago">Pagas</option>
                <option value="">Todas</option>
              </select>
            </label>''',
    '''            <!-- Filtro de status removido temporariamente para preservar a estabilidade. -->
            <input id="pagamentoFiltroStatus" type="hidden" value="pendente" />'''
)

# 2) O app principal deixa de escutar mudanças desse filtro e mantém o estado fixo pendente.
replace_once(
    "app.js",
    '''    "pagamentoFiltroReferencia",
    "pagamentoFiltroPreco",
    "pagamentoFiltroStatus"
  ].forEach(id => {''',
    '''    "pagamentoFiltroReferencia",
    "pagamentoFiltroPreco"
  ].forEach(id => {'''
)
replace_once(
    "app.js",
    '  const filtroStatus = document.getElementById("pagamentoFiltroStatus")?.value || "pendente";',
    '  const filtroStatus = "pendente"; // Filtro de status desativado temporariamente.'
)
replace_once(
    "app.js",
    '''      const status = document.getElementById("pagamentoFiltroStatus");
      if (status) status.value = "pendente";
      renderPagamentos();''',
    '''      renderPagamentos();'''
)

# 3) O módulo financeiro também deixa de escutar o filtro e usa o estado fixo pendente.
replace_once(
    "corponu-pagamentos-seguro.js",
    '      status: String(document.getElementById("pagamentoFiltroStatus")?.value || "pendente")',
    '      status: "pendente" // Filtro de status removido temporariamente.'
)
replace_once(
    "corponu-pagamentos-seguro.js",
    '      `Pagamento: ${textoOpcaoSelecionada("pagamentoFiltroStatus", "Todos")}`',
    '      "Pagamento: Pendentes"'
)
replace_once(
    "corponu-pagamentos-seguro.js",
    '''        "pagamentoFiltroReferencia",
        "pagamentoFiltroPreco",
        "pagamentoFiltroStatus"
      ];''',
    '''        "pagamentoFiltroReferencia",
        "pagamentoFiltroPreco"
      ];'''
)

# 4) Nova versão somente para entregar essa remoção aos computadores.
replace_once("sw.js", OLD_VERSION, NEW_VERSION)
replace_once("corponu-atualizador.js", OLD_VERSION, NEW_VERSION)

release = {
    "version": NEW_VERSION,
    "updatedAt": UPDATED_AT,
    "notes": "Remove temporariamente somente o filtro de status da aba Pagamentos para impedir novos travamentos. Mantém o estado interno fixo em pendente e preserva cálculos, central de pendências, relatórios, pagamentos e Firebase."
}
Path("corponu-release.json").write_text(
    json.dumps(release, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

readme = f'''CORPONU — REMOÇÃO TEMPORÁRIA DO FILTRO DE STATUS
Versão: {NEW_VERSION}

SUBSTITUA NA RAIZ DO REPOSITÓRIO, NO MESMO COMMIT:
- index.html
- app.js
- corponu-pagamentos-seguro.js
- sw.js
- corponu-atualizador.js
- corponu-release.json

O QUE FOI REMOVIDO
- Somente o campo visual “Pagamento” e suas opções de status.
- Os listeners que reagiam à alteração desse campo.

COMO O SISTEMA FICA
- A aba Pagamentos permanece no estado interno fixo “pendente”.
- A Central de Pendências de valores continua disponível.
- Relatórios, PIX, confirmação, lançamentos manuais e restantes continuam preservados.
- Nenhuma regra, coleção ou dado do Firebase foi alterado.

APÓS SUBIR
1. Aguarde o GitHub Pages/Firebase Hosting concluir a publicação.
2. Nos computadores, feche completamente o sistema e abra novamente uma vez.
3. O campo “Pagamento” não deverá mais aparecer.
'''
Path("LEIA-ME-REMOVER-FILTRO-STATUS.txt").write_text(readme, encoding="utf-8")

print(f"Arquivos preparados: {NEW_VERSION}")
