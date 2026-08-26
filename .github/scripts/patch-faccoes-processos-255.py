from pathlib import Path
import re
import json


def replace_regex_once(text, pattern, replacement, label):
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 bloco, encontrado {count}")
    return result


update_path = Path("update.js")
text = update_path.read_text(encoding="utf-8")

# O painel de processos passa a nascer exclusivamente dentro de Gerenciar facções.
text = replace_regex_once(
    text,
    r"  function criarPainelProcessosFaccoes\(\) \{.*?\n  \}\n\n(?=  function criarHtmlNovoProcessoFaccao\(\))",
    '''  function criarPainelProcessosFaccoes() {
    let painel = document.getElementById("painelProcessosFaccoes");
    const area = garantirAreaProcessosDentroGerenciarFaccoes();
    const mount = area?.querySelector("#mountProcessosDentroGerenciarFaccoes");
    if (!mount) return painel || null;

    if (painel) {
      if (painel.parentElement !== mount) mount.appendChild(painel);
      return painel;
    }

    painel = document.createElement("section");
    painel.id = "painelProcessosFaccoes";
    painel.className = "processos-faccoes-painel";
    painel.innerHTML = `
      <div id="gradeProcessosFaccoes" class="processos-faccoes-grade"></div>
      <div id="detalheProcessoFaccao" class="processos-faccoes-detalhe hidden"></div>
    `;
    mount.appendChild(painel);
    return painel;
  }

''',
    "criarPainelProcessosFaccoes",
)

# Ao fechar Gerenciar facções, o painel não volta mais para a área operacional.
text = replace_regex_once(
    text,
    r"  function posicionarProcessosDentroGerenciarFaccoes\(dentro\) \{.*?\n  \}\n\n(?=  function sincronizarLocalProcessosFaccoes\(\))",
    '''  function posicionarProcessosDentroGerenciarFaccoes(dentro) {
    const area = garantirAreaProcessosDentroGerenciarFaccoes();
    const mount = area?.querySelector("#mountProcessosDentroGerenciarFaccoes");
    const painelProcessos = criarPainelProcessosFaccoes();
    if (!mount || !painelProcessos) return;

    if (painelProcessos.parentElement !== mount) mount.appendChild(painelProcessos);

    if (!dentro) {
      painelProcessos.dataset.gerenciandoProcessosFaccoes = "0";
      const botao = document.getElementById("btnGerenciarProcessosFaccoes");
      if (botao) botao.textContent = "Gerenciar processos";
      renderDetalheProcessoFaccao();
    }
  }

''',
    "posicionarProcessosDentroGerenciarFaccoes",
)

proibidos = [
    'cardsResumo.insertAdjacentElement("afterend", painel)',
    'cardsResumo.insertAdjacentElement("afterend", painelProcessos)',
    '<h3>Processos das facções</h3>',
    '<p>Clique em um processo para ver quais facções realizam esse serviço.</p>',
]
restantes = [item for item in proibidos if item in text]
if restantes:
    raise SystemExit("Trechos visuais antigos ainda presentes: " + " | ".join(restantes))

obrigatorios = [
    "function getNomesProcessosFaccoesAtivos",
    "function getFaccoesGerenciadasPorProcesso",
    "function salvarConfiguracaoProcessosFaccoes",
    "function aplicarFaccoesGerenciadasNoDestinoMovimentacao",
    "function garantirAreaProcessosDentroGerenciarFaccoes",
    'mount.appendChild(painel)',
]
faltando = [item for item in obrigatorios if item not in text]
if faltando:
    raise SystemExit("Proteção: lógica essencial ausente: " + " | ".join(faltando))

update_path.write_text(text, encoding="utf-8")

# Cache do update.js e do lazy loader.
index_path = Path("index.html")
html = index_path.read_text(encoding="utf-8")
old_update = '<script src="update.js?v=2026-08-12-precos-selecao-estavel-187"></script>'
new_update = '<script src="update.js?v=2026-08-26-faccoes-processos-somente-gerenciar-255"></script>'
if old_update not in html:
    raise SystemExit("Tag esperada de update.js não encontrada")
html = html.replace(old_update, new_update, 1)

old_loader = '<script src="./corponu-atualizador.js?v=2026-08-26-faccoes-lateral-alca-254-prod"></script>'
new_loader = '<script src="./corponu-atualizador.js?v=2026-08-26-faccoes-processos-somente-gerenciar-255"></script>'
if old_loader not in html:
    raise SystemExit("Tag 254 do atualizador não encontrada")
html = html.replace(old_loader, new_loader, 1)
index_path.write_text(html, encoding="utf-8")

loader_path = Path("corponu-atualizador.js")
loader = loader_path.read_text(encoding="utf-8")
old_release = 'const LOCAL_RELEASE = "2026-08-26-faccoes-lateral-alca-254-prod";'
new_release = 'const LOCAL_RELEASE = "2026-08-26-faccoes-processos-somente-gerenciar-255";'
if old_release not in loader:
    raise SystemExit("Release 254 não encontrada no atualizador")
loader_path.write_text(loader.replace(old_release, new_release, 1), encoding="utf-8")

release_path = Path("corponu-release.json")
data = json.loads(release_path.read_text(encoding="utf-8"))
data["version"] = "2026-08-26-faccoes-processos-somente-gerenciar-255"
data["updatedAt"] = "2026-08-26T10:08:00-03:00"
data["notes"] = (
    "Limpeza estrutural de Facções. O painel de processos não é mais criado na área operacional. "
    "A configuração e os cards de processos existem somente dentro de Gerenciar facções. "
    "O update.js não move mais o painel para depois dos cards-resumo ao fechar o gerenciamento. "
    "APIs de processos/facções, Lateral/Alça 254, pagamentos e Calcinha 253 permanecem intactos. "
    "Sem CSS de ocultação, MutationObserver de remoção ou patch pós-render. "
    "Backup: backup/pre-remover-painel-processos-255."
)
release_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Processos 255: painel restrito à área Gerenciar facções.")
