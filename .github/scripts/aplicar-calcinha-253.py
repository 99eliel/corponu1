from pathlib import Path
import json
from datetime import datetime, timezone, timedelta

ROOT = Path('.')


def trocar(path, antigo, novo, descricao, quantidade=1):
    p = ROOT / path
    texto = p.read_text(encoding='utf-8')
    qtd = texto.count(antigo)
    if qtd != quantidade:
        raise SystemExit(f'ERRO {descricao}: esperado {quantidade}, encontrado {qtd}.')
    p.write_text(texto.replace(antigo, novo, quantidade), encoding='utf-8')


def remover(path, trecho, descricao, quantidade=1):
    trocar(path, trecho, '', descricao, quantidade)


# -----------------------------------------------------------------------------
# 1) Dual Mode: integrar definitivamente a lógica opcional que antes era
#    aplicada em runtime por corponu-calcinha-planejamento-opcional-129.js.
# -----------------------------------------------------------------------------
dual = ROOT / 'corponu-dual-mode.js'
fonte = dual.read_text(encoding='utf-8')


def dual_trocar(antigo, novo, descricao, quantidade=1):
    global fonte
    qtd = fonte.count(antigo)
    if qtd != quantidade:
        raise SystemExit(f'ERRO Dual Mode / {descricao}: esperado {quantidade}, encontrado {qtd}.')
    fonte = fonte.replace(antigo, novo, quantidade)


dual_trocar(
    'const VERSION = "2026-07-28-calcinha-sem-silk-envio-historico-2";',
    'const VERSION = "2026-08-25-calcinha-faccao-livre-253";',
    'versão',
)

dual_trocar(
    '? "Informe necessidade, serviço e facção no planejamento. Cotton Line/Corpo Nu será preenchido no Manejo."',
    '? "Informe a necessidade. Serviço é opcional e a facção será escolhida livremente no momento do envio. Cotton Line/Corpo Nu será preenchido no Manejo."',
    'descrição do cadastro de OP',
)

dual_trocar(
    '<div class="notice small"><strong>Planejamento da calcinha:</strong> a linha Cotton Line/Corpo Nu ficará em branco e será informada depois no Manejo.</div>',
    '<div class="notice small"><strong>Planejamento da calcinha:</strong> a facção não fica presa à OP. Serviço pode ser sugerido aqui e a facção será escolhida no momento do envio. A linha Cotton Line/Corpo Nu será informada no Manejo.</div>',
    'aviso do planejamento',
)

dual_trocar(
    '<label class="corponu-dual-field">Serviço<select id="ordemCalcinhaProcesso"><option value="">Selecione</option>',
    '<label class="corponu-dual-field">Serviço sugerido (opcional)<select id="ordemCalcinhaProcesso"><option value="">Definir no envio</option>',
    'campo serviço manual',
)

dual_trocar(
    '<label class="corponu-dual-field">Facção<select id="ordemCalcinhaFaccao" disabled><option value="">Primeiro selecione o serviço</option></select></label>',
    '<label class="corponu-dual-field">Facção sugerida (opcional)<select id="ordemCalcinhaFaccao" disabled><option value="">Será escolhida no envio</option></select></label>',
    'campo facção manual',
)

dual_trocar(
    '<span>Serviço da calcinha</span><select id="pdfCalcinhaProcesso"><option value="">Selecione</option>',
    '<span>Serviço sugerido da calcinha (opcional)</span><select id="pdfCalcinhaProcesso"><option value="">Definir no envio</option>',
    'campo serviço PDF',
)

dual_trocar(
    '<span>Facção de destino</span><select id="pdfCalcinhaFaccao" disabled><option value="">Primeiro selecione o serviço</option></select>',
    '<span>Facção sugerida (opcional)</span><select id="pdfCalcinhaFaccao" disabled><option value="">Será escolhida no envio</option></select>',
    'campo facção PDF',
)

dual_trocar(
    'select.innerHTML = `<option value="">Primeiro selecione o serviço</option>`;',
    'select.innerHTML = `<option value="">Será escolhida no envio</option>`;',
    'estado vazio seletor facção',
)

dual_trocar(
    'select.innerHTML = `<option value="">Selecione a facção</option>${[...new Set(names.map(item => String(item || "").trim()).filter(Boolean))].map(name => `<option value="${escapeHtml(normalize(name))}">${escapeHtml(normalize(name))}</option>`).join("")}`;',
    'select.innerHTML = `<option value="">Sem facção fixa — escolher no envio</option>${[...new Set(names.map(item => String(item || "").trim()).filter(Boolean))].map(name => `<option value="${escapeHtml(normalize(name))}">${escapeHtml(normalize(name))}</option>`).join("")}`;',
    'opção vazia seletor facção',
)

validacao_manual = '''    if (!CALCINHA_PROCESSES.includes(process) || !faction) {
      toast("Selecione o serviço e a facção planejada.", "error");
      return;
    }
'''
if fonte.count(validacao_manual) != 1:
    raise SystemExit('ERRO Dual Mode / validação obrigatória manual não encontrada exatamente uma vez.')
fonte = fonte.replace(validacao_manual, '', 1)

validacao_pdf = '''    if (!CALCINHA_PROCESSES.includes(process) || !faction) {
      toast("Selecione o serviço e a facção de destino das calcinhas.", "error");
      return;
    }
'''
if fonte.count(validacao_pdf) != 1:
    raise SystemExit('ERRO Dual Mode / validação obrigatória PDF não encontrada exatamente uma vez.')
fonte = fonte.replace(validacao_pdf, '', 1)

dual_trocar(
    '      planejamentoCalcinhaPendente: false,',
    '      planejamentoCalcinhaPendente: !CALCINHA_PROCESSES.includes(process),',
    'planejamento pendente',
    quantidade=2,
)

dual_trocar(
    'await registerLog(currentId ? "ordem_atualizada" : "ordem_criada", "ordemProducao", documentId, `Calcinha | OP ${opNumber} | Ref. ${reference} | ${process} | ${faction}`);',
    'await registerLog(currentId ? "ordem_atualizada" : "ordem_criada", "ordemProducao", documentId, `Calcinha | OP ${opNumber} | Ref. ${reference} | ${process || "SERVIÇO A DEFINIR NO ENVIO"} | FACÇÃO LIVRE NO ENVIO`);',
    'log OP manual',
)

# Modal passa a ser sempre o seletor do envio, não apenas para histórico.
dual_trocar(
    '<h3 id="corponuHistoricoEnvioTitulo">Enviar calcinha histórica para facção</h3>',
    '<h3 id="corponuHistoricoEnvioTitulo">Escolher serviço e facção para o envio</h3>',
    'título modal envio',
)

dual_trocar(
    '<div class="notice small"><strong>Registro importado:</strong> como esta OP veio da planilha antiga, o planejamento de serviço e facção será definido agora.</div>',
    '<div class="notice small"><strong>Facção livre:</strong> escolha o serviço e a facção para este envio. A facção não fica bloqueada na OP e pode ser diferente em cada novo envio.</div>',
    'aviso modal envio',
)

# Permitir processo inicial sugerido, mas nunca pré-selecionar/travar a facção.
dual_trocar(
    '  function chooseHistoricalPantyDestination(order) {',
    '  function chooseHistoricalPantyDestination(order, suggestedProcess = "") {',
    'assinatura modal envio',
)

dual_trocar(
    '''    if (processSelect) processSelect.value = "";
    if (factionSelect) {
      factionSelect.value = "";
      factionSelect.disabled = true;
      factionSelect.innerHTML = '<option value="">Primeiro selecione o serviço</option>';
    }
''',
    '''    const processoInicial = CALCINHA_PROCESSES.includes(normalize(suggestedProcess)) ? normalize(suggestedProcess) : "";
    if (processSelect) processSelect.value = processoInicial;
    if (factionSelect) {
      factionSelect.value = "";
      factionSelect.disabled = !processoInicial;
      factionSelect.innerHTML = processoInicial
        ? '<option value="">Escolha a facção deste envio</option>'
        : '<option value="">Primeiro selecione o serviço</option>';
    }
    if (processoInicial) fillFactionSelect("corponuHistoricoEnvioProcesso", "corponuHistoricoEnvioFaccao");
''',
    'inicialização modal envio',
)

# O envio sempre pergunta a facção; processo planejado serve apenas de sugestão.
envio_antigo = '''    const historical = isHistoricalPanty(order);
    let process = normalize(order.processoPlanejado);
    let faction = normalize(order.faccaoPlanejada);
    const rowData = readManejoRow(orderId);
    const line = lineValue(rowData.linhaCalcinha || order.linhaCalcinha);
    if (!line) {
      toast("Antes de enviar, escolha Cotton Line ou Corpo Nu na coluna Linha e salve.", "error");
      return;
    }
    if (historical) {
      const choice = await chooseHistoricalPantyDestination(order);
      if (!choice) return;
      process = choice.process;
      faction = choice.faction;
    } else if (!CALCINHA_PROCESSES.includes(process) || !faction) {
      toast("Esta nova OP não possui serviço/facção planejados. Edite a OP na aba Ordens → Calcinha.", "error");
      return;
    }
'''

envio_novo = '''    const historical = isHistoricalPanty(order);
    let process = normalize(order.processoPlanejado);
    let faction = "";
    const managementData = order?.manejosSetores?.calcinha || {};
    const rowData = dedicatedCalcinhaActive()
      ? {
          linhaCalcinha: order.linhaCalcinha || managementData.linhaCalcinha || "",
          fase: managementData.fase || order.fase || "",
          necessidade: managementData.necessidadeTexto || managementData.necessidade || order.necessidadeTexto || order.necessidade || ""
        }
      : readManejoRow(orderId);
    const line = lineValue(rowData.linhaCalcinha || order.linhaCalcinha);
    if (!line) {
      toast("Antes de enviar, escolha Cotton Line ou Corpo Nu na coluna Linha e salve.", "error");
      return;
    }
    const choice = await chooseHistoricalPantyDestination(order, process);
    if (!choice) return;
    process = choice.process;
    faction = choice.faction;
'''
dual_trocar(envio_antigo, envio_novo, 'fluxo de envio sem facção fixa')

dual_trocar(
    '        origemEnvio: historical ? "historico_escolha_no_envio" : "planejamento_op",',
    '        origemEnvio: "escolha_no_envio",',
    'origem da escolha de facção',
)

# Importação/cadastro continuam aceitando sugestões, mas nunca exigem facção.
dual_trocar(
    'if (!confirm(`Importar ${records.length} OP(s) de calcinha para ${faction}, serviço ${process}? A linha Cotton Line/Corpo Nu ficará em branco para preenchimento no Manejo.`)) return;',
    'const sugestaoImportacao = process ? ` Serviço sugerido: ${process}.` : "";\n    if (!confirm(`Importar ${records.length} OP(s) de calcinha?${sugestaoImportacao} A facção será escolhida no envio e a linha Cotton Line/Corpo Nu ficará em branco para preenchimento no Manejo.`)) return;',
    'confirmação importação',
)

dual_trocar(
    'observacoes: `Importada do PDF como calcinha. Serviço: ${process}. Facção: ${faction}. Linha a definir no Manejo.`,',
    'observacoes: process\n            ? `Importada do PDF como calcinha. Serviço sugerido: ${process}. Facção livre no envio. Linha a definir no Manejo.`\n            : "Importada do PDF como calcinha. Serviço e facção serão definidos no envio. Linha a definir no Manejo.",',
    'observação importação',
)

dual_trocar(
    'await registerLog("pdf_importado", "importacao", "pdf-calcinha", `${imported} OPs de calcinha importadas. Serviço ${process}; facção ${faction}; ignoradas ${skipped}.`);',
    'await registerLog("pdf_importado", "importacao", "pdf-calcinha", `${imported} OPs de calcinha importadas. ${process ? `Serviço sugerido ${process}` : "Serviço a definir no envio"}; facção livre no envio; ignoradas ${skipped}.`);',
    'log importação',
)

dual.write_text(fonte, encoding='utf-8')


# -----------------------------------------------------------------------------
# 2) Manejo Calcinha 253: nova versão nativa da tela dedicada.
#    Ela substitui 252 no carregador; 252 permanece apenas como rollback.
# -----------------------------------------------------------------------------
origem = ROOT / 'corponu-manejo-calcinha-dedicado-252.js'
destino = ROOT / 'corponu-manejo-calcinha-dedicado-253.js'
calc = origem.read_text(encoding='utf-8')


def calc_trocar(antigo, novo, descricao, quantidade=1):
    global calc
    qtd = calc.count(antigo)
    if qtd != quantidade:
        raise SystemExit(f'ERRO Calcinha 253 / {descricao}: esperado {quantidade}, encontrado {qtd}.')
    calc = calc.replace(antigo, novo, quantidade)


calc_trocar('const VERSION = "2026-08-25-manejo-calcinha-dedicado-252";', 'const VERSION = "2026-08-25-manejo-calcinha-filtros-253";', 'versão')
calc_trocar('const GUARD = "__CORPONU_MANEJO_CALCINHA_DEDICADO_252__";', 'const GUARD = "__CORPONU_MANEJO_CALCINHA_FILTROS_253__";', 'guard')
calc_trocar('const STYLE_ID = "corponuManejoCalcinhaDedicado252Style";', 'const STYLE_ID = "corponuManejoCalcinhaDedicado253Style";', 'style id')
calc_trocar('const DATALIST_ID = "corponuManejoCalcinhaFases252";', 'const DATALIST_ID = "corponuManejoCalcinhaFases253";', 'datalist id')
calc_trocar('  const drafts = new Map();\n', '  const drafts = new Map();\n  const fasesSelecionadas = new Set();\n', 'estado de filtro múltiplo')

calc_trocar(
    '#${ROOT_ID} .cn252-filtros{display:grid;grid-template-columns:minmax(220px,2fr) minmax(145px,1fr) minmax(160px,1fr) auto;gap:8px;margin-bottom:12px}',
    '#${ROOT_ID} .cn252-filtros{display:grid;grid-template-columns:minmax(220px,2fr) minmax(145px,1fr) minmax(210px,1.35fr) minmax(155px,1fr) auto;gap:8px;margin-bottom:8px}',
    'grid dos filtros',
)
calc_trocar(
    '#${ROOT_ID} .cn252-op{display:grid;grid-template-columns:minmax(160px,1.15fr) 105px minmax(145px,1fr) minmax(170px,1.25fr) minmax(190px,1.5fr) minmax(160px,1fr) auto;gap:8px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}',
    '#${ROOT_ID} .cn252-op{display:grid;grid-template-columns:minmax(160px,1.15fr) 90px minmax(145px,1fr) minmax(170px,1.2fr) minmax(190px,1.45fr) auto;gap:8px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}',
    'grid dos cards',
)
calc_trocar(
    '      #${ROOT_ID} .cn252-ident span,#${ROOT_ID} .cn252-destino span{display:block;margin-top:2px;color:#64748b;font-size:11px;line-height:1.35}\n      #${ROOT_ID} .cn252-qtd{font-weight:900;text-align:center;color:#334155}\n      #${ROOT_ID} .cn252-destino strong{display:block;font-size:12px;color:#334155}\n',
    '      #${ROOT_ID} .cn252-ident span{display:block;margin-top:2px;color:#64748b;font-size:11px;line-height:1.35}\n      #${ROOT_ID} .cn252-qtd{font-weight:900;text-align:center;color:#334155}\n      #${ROOT_ID} .cn253-fase-filtro{position:relative}\n      #${ROOT_ID} .cn253-fase-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left}\n      #${ROOT_ID} .cn253-fase-menu{display:none;position:absolute;z-index:30;top:calc(100% + 5px);left:0;width:min(360px,90vw);padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.16)}\n      #${ROOT_ID} .cn253-fase-filtro.aberto .cn253-fase-menu{display:block}\n      #${ROOT_ID} .cn253-fase-menu-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:11px;font-weight:900;color:#475569}\n      #${ROOT_ID} .cn253-fase-opcoes{display:grid;gap:3px;max-height:250px;overflow:auto}\n      #${ROOT_ID} .cn253-fase-opcao{display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px;cursor:pointer;color:#334155;font-size:12px}\n      #${ROOT_ID} .cn253-fase-opcao:hover{background:#f8fafc}\n      #${ROOT_ID} .cn253-fase-opcao input{width:auto;min-height:0;margin:0;accent-color:#7c3aed}\n      #${ROOT_ID} .cn253-fase-chips{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;min-height:0}\n      #${ROOT_ID} .cn253-fase-chips:empty{display:none}\n      #${ROOT_ID} .cn253-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #c4b5fd;border-radius:999px;padding:4px 8px;background:#f5f3ff;color:#5b21b6;font-size:11px;font-weight:800}\n      #${ROOT_ID} .cn253-chip button{border:0;background:transparent;color:inherit;padding:0;cursor:pointer;font-weight:900}\n      #${ROOT_ID} .cn253-filtro-acoes{display:flex;gap:6px}\n',
    'css filtro de fases',
)
calc_trocar(
    '@media (max-width:1180px){#${ROOT_ID} .cn252-op{grid-template-columns:1.2fr 85px 1fr 1fr 1.3fr}.cn252-destino{display:none!important}#${ROOT_ID} .cn252-acoes{grid-column:auto}}',
    '@media (max-width:1180px){#${ROOT_ID} .cn252-op{grid-template-columns:1.2fr 85px 1fr 1fr 1.3fr auto}#${ROOT_ID} .cn252-acoes{grid-column:auto}}',
    'responsivo desktop',
)

filtros_html_antigo = '''        <div class="cn252-filtros">
          <input id="cn252Busca" type="search" autocomplete="off" placeholder="Buscar OP, referência, cor, fase ou facção...">
          <select id="cn252FiltroLinha">
            <option value="">Todas as linhas</option>
            <option value="cotton_line">Cotton Line</option>
            <option value="corpo_nu">Corpo Nu</option>
            <option value="sem_linha">A definir</option>
          </select>
          <select id="cn252FiltroStatus">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="organizada">Organizada</option>
            <option value="bipado">Bipado</option>
          </select>
          <button type="button" class="cn252-btn" id="cn252Atualizar">Atualizar</button>
        </div>
'''
filtros_html_novo = '''        <div class="cn252-filtros">
          <input id="cn252Busca" type="search" autocomplete="off" placeholder="Buscar OP, referência, cor, fase ou necessidade...">
          <select id="cn252FiltroLinha">
            <option value="">Todas as linhas</option>
            <option value="cotton_line">Cotton Line</option>
            <option value="corpo_nu">Corpo Nu</option>
            <option value="sem_linha">A definir</option>
          </select>
          <div class="cn253-fase-filtro" id="cn253FaseFiltro">
            <button type="button" class="cn252-btn cn253-fase-toggle" data-acao="toggle-fases"><span id="cn253FaseResumo">Todas as fases</span><span>▾</span></button>
            <div class="cn253-fase-menu">
              <div class="cn253-fase-menu-topo"><span>Selecione uma ou mais fases</span><button type="button" class="cn252-btn" data-acao="limpar-fases">Limpar</button></div>
              <div class="cn253-fase-opcoes" id="cn253FaseOpcoes"></div>
            </div>
          </div>
          <select id="cn252FiltroStatus">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="organizada">Organizada</option>
            <option value="bipado">Bipado</option>
          </select>
          <div class="cn253-filtro-acoes">
            <button type="button" class="cn252-btn" id="cn252Atualizar">Atualizar</button>
            <button type="button" class="cn252-btn" data-acao="limpar-filtros">Limpar filtros</button>
          </div>
          <div class="cn253-fase-chips" id="cn253FaseChips"></div>
        </div>
'''
calc_trocar(filtros_html_antigo, filtros_html_novo, 'html dos filtros')

calc_trocar(
    '''  function filtros() {
    return {
      busca: normalizar(document.getElementById("cn252Busca")?.value),
      linha: texto(document.getElementById("cn252FiltroLinha")?.value),
      status: texto(document.getElementById("cn252FiltroStatus")?.value)
    };
  }
''',
    '''  function filtros() {
    return {
      busca: normalizar(document.getElementById("cn252Busca")?.value),
      linha: texto(document.getElementById("cn252FiltroLinha")?.value),
      status: texto(document.getElementById("cn252FiltroStatus")?.value),
      fases: [...fasesSelecionadas]
    };
  }
''',
    'função filtros',
)

calc_trocar(
    '''      if (f.status && statusDaOp(op) !== f.status) return false;
      if (f.busca) {
        const palheiro = normalizar([
          op.numeroOP,
          op.referencia,
          op.cor,
          op.produtoNome,
          v.fase,
          v.necessidade,
          manejo(op).faccao,
          op.faccaoPlanejada,
          manejo(op).processo,
          op.processoPlanejado
        ].join(" "));
''',
    '''      if (f.status && statusDaOp(op) !== f.status) return false;
      if (f.fases.length && !f.fases.includes(normalizar(v.fase))) return false;
      if (f.busca) {
        const palheiro = normalizar([
          op.numeroOP,
          op.referencia,
          op.cor,
          op.produtoNome,
          v.fase,
          v.necessidade
        ].join(" "));
''',
    'lógica acumulativa dos filtros',
)

insercao_fases = '''  function atualizarFiltroFases(fases) {
    const opcoes = document.getElementById("cn253FaseOpcoes");
    const resumo = document.getElementById("cn253FaseResumo");
    const chips = document.getElementById("cn253FaseChips");
    const mapa = new Map(fases.map(fase => [normalizar(fase), fase]));

    [...fasesSelecionadas].forEach(chave => {
      if (!mapa.has(chave)) fasesSelecionadas.delete(chave);
    });

    if (opcoes) {
      opcoes.innerHTML = fases.length
        ? fases.map(fase => {
            const chave = normalizar(fase);
            const checked = fasesSelecionadas.has(chave) ? "checked" : "";
            return `<label class="cn253-fase-opcao"><input type="checkbox" data-filtro-fase="${escapeHtml(chave)}" ${checked}><span>${escapeHtml(fase)}</span></label>`;
          }).join("")
        : '<div class="cn252-vazio">Nenhuma fase cadastrada.</div>';
    }

    if (resumo) {
      resumo.textContent = fasesSelecionadas.size
        ? `${fasesSelecionadas.size} fase${fasesSelecionadas.size === 1 ? "" : "s"} selecionada${fasesSelecionadas.size === 1 ? "" : "s"}`
        : "Todas as fases";
    }

    if (chips) {
      chips.innerHTML = [...fasesSelecionadas]
        .map(chave => mapa.has(chave)
          ? `<span class="cn253-chip">${escapeHtml(mapa.get(chave))}<button type="button" data-acao="remover-fase" data-fase="${escapeHtml(chave)}" aria-label="Remover fase">×</button></span>`
          : "")
        .join("");
    }
  }

  function limparFiltros() {
    const busca = document.getElementById("cn252Busca");
    const linha = document.getElementById("cn252FiltroLinha");
    const status = document.getElementById("cn252FiltroStatus");
    if (busca) busca.value = "";
    if (linha) linha.value = "";
    if (status) status.value = "";
    fasesSelecionadas.clear();
    limite = PAGE_SIZE;
    document.getElementById("cn253FaseFiltro")?.classList.remove("aberto");
    agendarRender();
  }

'''
calc_trocar('  function montarOp(op) {\n', insercao_fases + '  function montarOp(op) {\n', 'funções do filtro de fases')

calc_trocar(
    '''    const m = manejo(op);
    const status = statusDaOp(op);
    const processo = texto(m.processo || op.processoPlanejado || op.processo || "");
    const faccao = texto(m.faccao || op.faccaoPlanejada || op.destino || "");
''',
    '''    const status = statusDaOp(op);
''',
    'remoção do destino planejado do card',
)
calc_trocar(
    '''        <div class="cn252-destino">
          <strong>${escapeHtml(processo || "Destino ainda não definido")}</strong>
          <span>${escapeHtml(faccao || "Sem facção planejada")}</span>
        </div>
''',
    '',
    'bloco visual de destino planejado',
)

calc_trocar(
    '            <p>Tela própria da Calcinha. Linha, Fase e Necessidade são salvas diretamente na OP, sem depender da tabela do Sutiã.</p>',
    '            <p>Tela própria da Calcinha. Linha, Fase e Necessidade são salvas diretamente na OP. A facção é escolhida livremente somente no momento do envio.</p>',
    'texto do topo',
)

calc_trocar(
    '    if (datalist) datalist.innerHTML = fases.map(fase => `<option value="${escapeHtml(fase)}"></option>`).join("");\n\n    const filtradas = filtrarOrdens(todas);',
    '    if (datalist) datalist.innerHTML = fases.map(fase => `<option value="${escapeHtml(fase)}"></option>`).join("");\n    atualizarFiltroFases(fases);\n\n    const filtradas = filtrarOrdens(todas);',
    'atualização visual do filtro de fases',
)

# Salvar a fase também na raiz da OP para que o envio dedicado nunca dependa da tabela antiga.
calc_trocar(
    '        necessidade: dados.necessidade,\n        necessidadeTexto: dados.necessidade,',
    '        fase: dados.fase,\n        necessidade: dados.necessidade,\n        necessidadeTexto: dados.necessidade,',
    'fase raiz Firestore',
)
calc_trocar(
    '        linhaCalcinhaLabel: linhaLabel,\n        necessidade: dados.necessidade,',
    '        linhaCalcinhaLabel: linhaLabel,\n        fase: dados.fase,\n        necessidade: dados.necessidade,',
    'fase raiz mapa local',
)

# Remover sincronização com a tabela legada: o Dual Mode 253 lê a própria OP.
ini = calc.find('  function sincronizarLinhaOculta(orderId, dados) {')
fim = calc.find('\n  async function salvar(orderId, options = {}) {', ini)
if ini < 0 or fim < 0:
    raise SystemExit('ERRO Calcinha 253 / função sincronizarLinhaOculta não encontrada.')
calc = calc[:ini] + calc[fim+1:]
calc_trocar('      sincronizarLinhaOculta(id, dados);\n', '', 'chamada sync legado após salvar')
calc_trocar('    sincronizarLinhaOculta(id, dados);\n\n', '', 'chamada sync legado antes de enviar')

# Eventos do filtro múltiplo.
calc_trocar(
    '''    root.addEventListener("change", event => {
      const campo = event.target?.closest?.("[data-campo]");
      if (campo) {
        registrarDraft(campo.closest("[data-cn252-op]"));
        return;
      }
      if (["cn252FiltroLinha", "cn252FiltroStatus"].includes(event.target?.id)) {
        limite = PAGE_SIZE;
        agendarRender();
      }
    });
''',
    '''    root.addEventListener("change", event => {
      const faseFiltro = event.target?.closest?.("[data-filtro-fase]");
      if (faseFiltro) {
        const chave = normalizar(faseFiltro.dataset.filtroFase || "");
        if (chave) {
          if (faseFiltro.checked) fasesSelecionadas.add(chave);
          else fasesSelecionadas.delete(chave);
          limite = PAGE_SIZE;
          agendarRender();
        }
        return;
      }
      const campo = event.target?.closest?.("[data-campo]");
      if (campo) {
        registrarDraft(campo.closest("[data-cn252-op]"));
        return;
      }
      if (["cn252FiltroLinha", "cn252FiltroStatus"].includes(event.target?.id)) {
        limite = PAGE_SIZE;
        agendarRender();
      }
    });
''',
    'evento change filtros',
)

calc_trocar(
    '''      const acao = botao.dataset.acao;
      if (acao === "mais") {
        limite += PAGE_SIZE;
        agendarRender();
        return;
      }
''',
    '''      const acao = botao.dataset.acao;
      if (acao === "toggle-fases") {
        document.getElementById("cn253FaseFiltro")?.classList.toggle("aberto");
        return;
      }
      if (acao === "limpar-fases") {
        fasesSelecionadas.clear();
        limite = PAGE_SIZE;
        agendarRender();
        return;
      }
      if (acao === "remover-fase") {
        fasesSelecionadas.delete(normalizar(botao.dataset.fase || ""));
        limite = PAGE_SIZE;
        agendarRender();
        return;
      }
      if (acao === "limpar-filtros") {
        limparFiltros();
        return;
      }
      if (acao === "mais") {
        limite += PAGE_SIZE;
        agendarRender();
        return;
      }
''',
    'ações filtros',
)

calc_trocar(
    '''    document.addEventListener("corponu:dual-ready", sincronizarModo);
    window.addEventListener("pageshow", sincronizarModo);
''',
    '''    document.addEventListener("click", event => {
      const filtro = document.getElementById("cn253FaseFiltro");
      if (filtro?.classList.contains("aberto") && !event.target?.closest?.("#cn253FaseFiltro")) filtro.classList.remove("aberto");
    }, true);
    document.addEventListener("corponu:dual-ready", sincronizarModo);
    window.addEventListener("pageshow", sincronizarModo);
''',
    'fechamento externo filtro fases',
)

calc = calc.replace('[Calcinha 252]', '[Calcinha 253]')
calc = calc.replace('Manejo Calcinha dedicado ativo:', 'Manejo Calcinha 253 ativo:')
calc_trocar(
    '    drafts\n  };',
    '    drafts,\n    fasesSelecionadas\n  };',
    'api debug filtro',
)

destino.write_text(calc, encoding='utf-8')


# -----------------------------------------------------------------------------
# 3) Atualizador: carregar Dual Mode direto, sem patch 129, e Calcinha 253.
# -----------------------------------------------------------------------------
atualizador = ROOT / 'corponu-atualizador.js'
a = atualizador.read_text(encoding='utf-8')


def a_trocar(antigo, novo, descricao, quantidade=1):
    global a
    qtd = a.count(antigo)
    if qtd != quantidade:
        raise SystemExit(f'ERRO Atualizador / {descricao}: esperado {quantidade}, encontrado {qtd}.')
    a = a.replace(antigo, novo, quantidade)


a_trocar(
    'const LOCAL_RELEASE = "2026-08-25-manejo-calcinha-dedicado-252";',
    'const LOCAL_RELEASE = "2026-08-25-manejo-calcinha-filtros-253";',
    'versão',
)
a_trocar(
    '''  const MODULOS_APOS_LOGIN = [
    ["corponu-calcinha-planejamento-opcional-129.js", "calcinha-planejamento-opcional-129", "Não foi possível tornar serviço e facção opcionais nas OPs de calcinha."],
    ["corponu-dual-ready-bridge.js", "dual-ready-bridge", "Não foi possível sincronizar o carregamento do modo Sutiã/Calcinha."],
    ["corponu-manejo-calcinha-dedicado-252.js", "manejo-calcinha-dedicado-252", "Não foi possível carregar o Manejo Calcinha dedicado."]
  ];

  function reservarModoCalcinhaOpcional() {
    if (document.querySelector('script[data-corponu-dual-mode="1"]')) return;
    const marcador = document.createElement("script");
    marcador.dataset.corponuDualMode = "1";
    marcador.dataset.corponuDualOpcionalGuard = LOCAL_RELEASE;
    document.head.appendChild(marcador);
  }
''',
    '''  const MODULOS_APOS_LOGIN = [
    ["corponu-dual-mode.js", "dual-mode", "Não foi possível carregar o modo Sutiã/Calcinha."],
    ["corponu-dual-ready-bridge.js", "dual-ready-bridge", "Não foi possível sincronizar o carregamento do modo Sutiã/Calcinha."],
    ["corponu-manejo-calcinha-dedicado-253.js", "manejo-calcinha-filtros-253", "Não foi possível carregar o Manejo Calcinha 253."]
  ];
''',
    'pacote após login',
)
a_trocar(
    '    script.dataset.corponuModulo = marcador;\n',
    '    script.dataset.corponuModulo = marcador;\n    if (nomeArquivo === "corponu-dual-mode.js") script.dataset.corponuDualMode = "1";\n',
    'marcador Dual Mode',
)
a_trocar('    reservarModoCalcinhaOpcional();\n', '', 'reserva no iniciar')
a_trocar('  reservarModoCalcinhaOpcional();\n', '', 'reserva no boot')
atualizador.write_text(a, encoding='utf-8')


# -----------------------------------------------------------------------------
# 4) Release.
# -----------------------------------------------------------------------------
release = ROOT / 'corponu-release.json'
dados = json.loads(release.read_text(encoding='utf-8'))
dados['version'] = '2026-08-25-manejo-calcinha-filtros-253'
dados['updatedAt'] = datetime.now(timezone(timedelta(hours=-3))).isoformat(timespec='seconds')
dados['notes'] = (
    'PRODUÇÃO. Refatoração nativa da Calcinha 253. A facção deixa de ficar presa à OP: o Dual Mode agora é carregado diretamente, '
    'sem o patch runtime 129, e a facção é escolhida no momento de cada envio. O Manejo Calcinha não mostra destino planejado como pendência. '
    'A tela dedicada ganha filtro acumulativo de Fases com seleção múltipla; várias fases selecionadas funcionam como OU entre si e são combinadas '
    'com busca, Linha e Status por E. Linha, Fase e Necessidade continuam salvas em uma única atualização. O envio dedicado lê os dados da própria OP '
    'e não depende mais da tabela legada escondida. Não altera Pagamentos, Sutiã Completo, app.js, regras Firebase ou dados históricos.'
)
release.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('Patch Calcinha 253 preparado com sucesso.')
