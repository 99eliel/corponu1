(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-tabela-135";
  const ALERTA_ID = "corponuDuplicidadeTabela135";
  const DETALHES_ID = "corponuDuplicidadeTabelaDetalhes135";
  const STYLE_ID = "corponuDuplicidadeTabelaStyle135";
  const CLASSE_DUPLICADA = "cn-duplicidade-tabela-135";

  if (window.__CORPONU_DUPLICIDADE_TABELA_135__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_TABELA_135__ = VERSION;

  let ultimaAssinatura = "";
  let agendamento = 0;
  let intervalo = 0;
  let detalhesAbertos = false;

  const texto = valor => String(valor ?? "").replace(/\s+/g, " ").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapar = valor => texto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function numero(valor, casas = 2) {
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return "";
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const convertido = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido.toFixed(casas) : normalizar(valor);
  }

  function paginaPagamentosAtiva() {
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return false;
    return pagina.classList.contains("active") || pagina.getClientRects().length > 0;
  }

  function localizarTabela() {
    const corpo = document.getElementById("listaEntregasPagamento");
    if (corpo instanceof HTMLTableSectionElement) return corpo.closest("table");
    if (corpo instanceof HTMLTableElement) return corpo;
    return document.querySelector("#pagamentos table:has(tbody tr)");
  }

  function mapaColunas(tabela) {
    const cabecalhos = [...tabela.querySelectorAll("thead th")].map(th => normalizar(th.textContent));
    const encontrar = (...termos) => cabecalhos.findIndex(cabecalho =>
      termos.some(termo => cabecalho === termo || cabecalho.startsWith(`${termo} `) || cabecalho.includes(termo))
    );

    const mapa = {
      data: encontrar("DATA", "CHEGADA"),
      op: encontrar("OP", "ORDEM"),
      referencia: encontrar("REF", "REFERENCIA"),
      faccao: encontrar("FACCAO", "QUEM FEZ"),
      processo: encontrar("PROCESSO", "SERVICO"),
      quantidade: encontrar("QTD", "QUANTIDADE"),
      total: encontrar("TOTAL", "VALOR"),
      status: encontrar("STATUS", "SITUACAO")
    };

    const fallback = {
      data: 0,
      op: 1,
      referencia: 2,
      faccao: 3,
      processo: 4,
      quantidade: 5,
      total: 6,
      status: 7
    };

    Object.keys(fallback).forEach(chave => {
      if (mapa[chave] < 0) mapa[chave] = fallback[chave];
    });
    return mapa;
  }

  function celula(celulas, indice) {
    return indice >= 0 && celulas[indice] ? texto(celulas[indice].textContent) : "";
  }

  function linhaVisivel(linha) {
    if (!(linha instanceof HTMLTableRowElement)) return false;
    if (linha.hidden || linha.getAttribute("aria-hidden") === "true") return false;
    const estilo = getComputedStyle(linha);
    return estilo.display !== "none" && estilo.visibility !== "hidden" && linha.getClientRects().length > 0;
  }

  function lerLinhas(tabela) {
    const mapa = mapaColunas(tabela);
    const linhas = [...tabela.querySelectorAll("tbody tr")];

    return linhas.flatMap((linha, indice) => {
      linha.classList.remove(CLASSE_DUPLICADA);
      delete linha.dataset.cnDuplicidadeGrupo135;

      if (!linhaVisivel(linha)) return [];
      const celulas = [...linha.cells];
      if (celulas.length < 7 || celulas.some(td => Number(td.colSpan) > 1)) return [];

      const item = {
        linha,
        indice,
        data: celula(celulas, mapa.data),
        op: celula(celulas, mapa.op),
        referencia: celula(celulas, mapa.referencia),
        faccao: celula(celulas, mapa.faccao),
        processo: celula(celulas, mapa.processo),
        quantidade: celula(celulas, mapa.quantidade),
        total: celula(celulas, mapa.total),
        status: celula(celulas, mapa.status)
      };

      const camposObrigatorios = [item.op, item.referencia, item.faccao, item.processo, item.quantidade, item.total];
      if (camposObrigatorios.some(valor => !texto(valor))) return [];

      item.chave = [
        normalizar(item.op),
        normalizar(item.referencia),
        normalizar(item.faccao),
        normalizar(item.processo),
        numero(item.quantidade, 4),
        numero(item.total, 2)
      ].join("|");

      return item.chave.replaceAll("|", "") ? [item] : [];
    });
  }

  function detectarGrupos(itens) {
    const mapa = new Map();
    itens.forEach(item => {
      if (!mapa.has(item.chave)) mapa.set(item.chave, []);
      mapa.get(item.chave).push(item);
    });

    return [...mapa.entries()]
      .filter(([, grupo]) => grupo.length > 1)
      .map(([chave, grupo], indice) => ({
        chave,
        id: `grupo-${indice + 1}`,
        itens: grupo,
        principal: grupo[0],
        extras: grupo.length - 1
      }));
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ALERTA_ID}{margin:12px 0 16px;padding:14px 16px;border:2px solid #dc2626;border-radius:14px;background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#7f1d1d;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;box-shadow:0 8px 24px #b91c1c1f}
      #${ALERTA_ID}.hidden{display:none!important}
      #${ALERTA_ID} .icone{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#b91c1c;color:#fff;font-size:20px;font-weight:1000}
      #${ALERTA_ID} strong{display:block;font-size:14px;font-weight:1000;line-height:1.35}
      #${ALERTA_ID} p{margin:4px 0 0;font-size:11px;font-weight:750;line-height:1.5}
      #${ALERTA_ID} button{min-height:40px;padding:8px 13px;border:1px solid #991b1b;border-radius:10px;background:#fff;color:#991b1b;font-weight:950;cursor:pointer}
      #${DETALHES_ID}{grid-column:1/-1;border-top:1px solid #fca5a5;padding-top:12px;display:grid;gap:9px}
      #${DETALHES_ID}.hidden{display:none!important}
      #${DETALHES_ID} article{padding:11px;border:1px solid #fecaca;border-radius:11px;background:#fff}
      #${DETALHES_ID} .topo{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      #${DETALHES_ID} .selo{padding:4px 7px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:9px;font-weight:1000;white-space:nowrap}
      #${DETALHES_ID} .meta{margin-top:7px;color:#475569;font-size:10px;font-weight:800;line-height:1.6}
      #listaEntregasPagamento tr.${CLASSE_DUPLICADA} td,
      #pagamentos table tr.${CLASSE_DUPLICADA} td{background:#fff1f2!important;border-top-color:#fca5a5!important;border-bottom-color:#fca5a5!important}
      @media(max-width:760px){#${ALERTA_ID}{grid-template-columns:auto 1fr}#${ALERTA_ID} button{grid-column:1/-1;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function garantirAlerta(tabela) {
    let alerta = document.getElementById(ALERTA_ID);
    if (alerta) return alerta;

    alerta = document.createElement("section");
    alerta.id = ALERTA_ID;
    alerta.className = "hidden";
    alerta.setAttribute("role", "alert");
    alerta.setAttribute("aria-live", "polite");
    alerta.innerHTML = `
      <div class="icone">!</div>
      <div>
        <strong data-duplicidade-titulo></strong>
        <p data-duplicidade-resumo></p>
      </div>
      <button type="button" data-duplicidade-detalhes>Ver linhas</button>
      <div id="${DETALHES_ID}" class="hidden"></div>
    `;

    alerta.querySelector("[data-duplicidade-detalhes]")?.addEventListener("click", () => {
      detalhesAbertos = !detalhesAbertos;
      alerta.querySelector(`#${DETALHES_ID}`)?.classList.toggle("hidden", !detalhesAbertos);
      const botao = alerta.querySelector("[data-duplicidade-detalhes]");
      if (botao) botao.textContent = detalhesAbertos ? "Ocultar linhas" : "Ver linhas";
    });

    const filtros = document.querySelector("#pagamentos .pagamento-filtros-entregas");
    if (filtros) filtros.insertAdjacentElement("afterend", alerta);
    else tabela.insertAdjacentElement("beforebegin", alerta);
    return alerta;
  }

  function renderizar(tabela, grupos, quantidadeLinhas) {
    const alerta = garantirAlerta(tabela);
    if (!alerta) return;

    if (!grupos.length) {
      alerta.classList.add("hidden");
      detalhesAbertos = false;
      return;
    }

    const extras = grupos.reduce((soma, grupo) => soma + grupo.extras, 0);
    grupos.forEach(grupo => grupo.itens.forEach(item => {
      item.linha.classList.add(CLASSE_DUPLICADA);
      item.linha.dataset.cnDuplicidadeGrupo135 = grupo.id;
    }));

    alerta.classList.remove("hidden");
    const titulo = alerta.querySelector("[data-duplicidade-titulo]");
    const resumo = alerta.querySelector("[data-duplicidade-resumo]");
    const detalhes = alerta.querySelector(`#${DETALHES_ID}`);

    if (titulo) titulo.textContent = `${extras} possível(is) lançamento(s) duplicado(s) nas linhas exibidas.`;
    if (resumo) resumo.textContent = `Foram comparadas ${quantidadeLinhas} linhas por OP, referência, facção, processo, quantidade e total. A data não impede o aviso.`;

    if (detalhes) {
      detalhes.innerHTML = grupos.map(grupo => {
        const base = grupo.principal;
        const linhas = grupo.itens.map(item =>
          `${escapar(item.data || "Sem data")} • ${escapar(item.status || "Sem status")}`
        ).join("<br>");
        return `
          <article>
            <div class="topo">
              <strong>OP ${escapar(base.op)} • Ref. ${escapar(base.referencia)} • ${escapar(base.processo)}</strong>
              <span class="selo">${grupo.itens.length} linhas iguais</span>
            </div>
            <div class="meta">
              Facção: ${escapar(base.faccao)}<br>
              Quantidade: ${escapar(base.quantidade)} • Total: ${escapar(base.total)}<br>
              Datas e situações:<br>${linhas}<br>
              Confira se é duplicidade ou reenvio legítimo antes de pagar ou excluir.
            </div>
          </article>
        `;
      }).join("");
      detalhes.classList.toggle("hidden", !detalhesAbertos);
    }
  }

  function assinaturaDaTabela(tabela) {
    return [...tabela.querySelectorAll("tbody tr")]
      .filter(linhaVisivel)
      .map(linha => texto(linha.textContent))
      .join("\n");
  }

  function verificar(forcar = false) {
    if (!paginaPagamentosAtiva()) return;
    const tabela = localizarTabela();
    if (!tabela) return;

    const assinatura = assinaturaDaTabela(tabela);
    if (!forcar && assinatura === ultimaAssinatura) return;
    ultimaAssinatura = assinatura;

    const itens = lerLinhas(tabela);
    const grupos = detectarGrupos(itens);
    renderizar(tabela, grupos, itens.length);
  }

  function agendar(forcar = false) {
    clearTimeout(agendamento);
    agendamento = window.setTimeout(() => verificar(forcar), 260);
  }

  function instalarEventos() {
    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof Element)) return;
      if (alvo.closest("#pagamentos")) {
        ultimaAssinatura = "";
        agendar(true);
        setTimeout(() => agendar(true), 700);
      }
    });

    document.addEventListener("input", event => {
      const alvo = event.target;
      if (!(alvo instanceof Element)) return;
      if (alvo.closest("#pagamentos input")) agendar(false);
    });

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest("#btnAtualizarPagamentos, [data-atualizar-pagamentos], #btnLimparFiltrosPagamento, [data-page='pagamentos'], [data-target='pagamentos']")) {
        ultimaAssinatura = "";
        setTimeout(() => agendar(true), 350);
        setTimeout(() => agendar(true), 1000);
      }
    });

    intervalo = window.setInterval(() => {
      if (paginaPagamentosAtiva()) verificar(false);
    }, 1600);

    window.addEventListener("beforeunload", () => clearInterval(intervalo), { once: true });
  }

  function iniciar() {
    [
      "alertaPagamentosDuplicadosFiltrado113",
      "stylePagamentosDuplicadosFiltrado113",
      "corponuDuplicidadeFiltro127",
      "corponuDuplicidadeFiltroStyle127",
      "corponuDuplicidadeFiltro133",
      "corponuDuplicidadeFiltroStyle133"
    ].forEach(id => document.getElementById(id)?.remove());

    injetarEstilos();
    instalarEventos();
    [250, 700, 1400, 2600].forEach(atraso => setTimeout(() => agendar(true), atraso));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
