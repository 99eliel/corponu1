#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OLD_RELEASE = "2026-08-31-faccoes-filtro-exato-nome-269"
NEW_RELEASE = "2026-08-31-lateral-alca-v2-270"
OLD_MODULE = "corponu-faccoes-lateral-alca-254.js"
NEW_MODULE = "corponu-faccoes-lateral-alca-v2-270.js"
EXPECTED_BLOB = "4ab69d166303bef97db364e94894d955ad8f89ba"


def fail(message):
    raise SystemExit(f"ERRO: {message}")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(f"{label}: esperado 1 ocorrência, encontrado {count}")
    return text.replace(old, new, 1)


new_module = ROOT / NEW_MODULE
if not new_module.exists():
    fail(f"{NEW_MODULE} ainda não foi baixado da homologação")

source = new_module.read_text(encoding="utf-8")
required = [
    'const VERSION = "2026-08-31-lateral-alca-v2-270"',
    'const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540',
    'nome: "CORTAGEM E MONTAGEM"',
    'faccaoProcesso: "ALÇA"',
    'tipoValor: "fixo"',
    'chegadaInformadaStatus: "aguardando_confirmacao_admin"',
    'chegadaInformadaStatus: "confirmada_admin"',
    'c.fs.writeBatch(c.db)',
    'window.CorpoNuFaccoesLateralAlca = api',
]
for item in required:
    if item not in source:
        fail(f"módulo homologado sem pós-condição obrigatória: {item}")

for forbidden in [
    "new MutationObserver",
    "setInterval",
    "[900, 2200, 4800]",
    "[1500, 3200, 5600]",
    'CONFIG_ID = "processos-corte"',
]:
    if forbidden in source:
        fail(f"módulo homologado contém padrão legado: {forbidden}")

# Troca canônica do módulo no loader e do release. Não injeta segundo módulo em paralelo.
updater_path = ROOT / "corponu-atualizador.js"
updater = updater_path.read_text(encoding="utf-8")
if OLD_RELEASE not in updater:
    fail("release-base inesperada em corponu-atualizador.js")
updater = replace_once(
    updater,
    '["corponu-faccoes-lateral-alca-254.js", "faccoes-lateral-alca-254", "Não foi possível carregar a área nativa de Lateral e Alça."]',
    '["corponu-faccoes-lateral-alca-v2-270.js", "faccoes-lateral-alca-v2-270", "Não foi possível carregar a área Lateral e Alça V2."]',
    "entrada do módulo Lateral e Alça no loader",
)
updater = updater.replace(OLD_RELEASE, NEW_RELEASE)
if OLD_MODULE in updater:
    fail("loader ainda referencia o módulo 254")
updater_path.write_text(updater, encoding="utf-8")

# Cache/release: só troca a versão exata atual, sem alterações genéricas em código de negócio.
for name in ["index.html", "update.js"]:
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    if OLD_RELEASE not in text:
        fail(f"release-base não encontrada em {name}")
    path.write_text(text.replace(OLD_RELEASE, NEW_RELEASE), encoding="utf-8")

notes = (
    "Produção. A área Lateral e Alça foi promovida da homologação para a V2 estrutural, substituindo o módulo 254 sem carregar dois fluxos em paralelo. "
    "LATERAL continua usando valor por referência e é o único processo que marca lateral pronta. ALÇA mantém o valor global existente com a regra de duas alças por peça. "
    "Dentro do grupo Alça foi incluído CORTAGEM E MONTAGEM com valor fixo de R$ 0,0540 por peça e as mesmas facções de Alça. "
    "Registros históricos de area=corte/movimentacaoCorte continuam sendo lidos sem migração, regravação ou exclusão; novos registros usam fluxoFaccoes=lateral_alca. "
    "Usuário comum informa chegada e o administrador confirma a baixa, com criação do pagamento na confirmação. A baixa usa batch atômico. "
    "A V2 remove observadores/timers e carregamentos completos repetidos da implementação anterior, usa cache de OP e renderização limitada. "
    "Nenhuma regra do Firebase foi alterada e nenhum dado histórico foi apagado."
)
metadata = {
    "version": NEW_RELEASE,
    "updatedAt": "2026-08-31T10:30:00-03:00",
    "notes": notes,
}
for name in ["corponu-release.json", "version.json"]:
    (ROOT / name).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# O arquivo antigo sai do repositório no mesmo commit funcional; não fica como código morto.
old_module = ROOT / OLD_MODULE
if not old_module.exists():
    fail(f"módulo antigo esperado não encontrado: {OLD_MODULE}")
old_module.unlink()

# Pós-condições de integração com as abas já vigentes na produção.
tabs = (ROOT / "corponu-faccoes-tres-abas-saida.js").read_text(encoding="utf-8")
for item in [
    "window.CorpoNuFaccoesLateralAlca?.mostrar?.()",
    "window.CorpoNuFaccoesLateralAlca?.ocultar?.()",
]:
    if item not in tabs:
        fail(f"integração das abas não encontrada: {item}")

if OLD_MODULE in updater_path.read_text(encoding="utf-8"):
    fail("módulo antigo continua ativo no loader")
if not new_module.exists():
    fail("módulo V2 não existe após promoção")
if old_module.exists():
    fail("módulo 254 não foi removido")

print("Promoção estrutural da Lateral e Alça V2 preparada com sucesso.")
