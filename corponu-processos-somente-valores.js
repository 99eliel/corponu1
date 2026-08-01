(() => {
  "use strict";

  const VERSION = "2026-08-01-processos-somente-valores-61";
  const PAGINA_ID = "processos";
  const CLASSE_OCULTA = "cn61-processos-oculto";
  const PROCESSOS_PERMITIDOS = new Set(["LATERAL", "ENCAPAR BOJO"]);

  if (window.__CORPONU_PROCESSOS_SOMENTE_VALORES__ === VERSION) return;
  window.__CORPONU_PROCESSOS_SOMENTE_VALORES__ = VERSION;

  let observadorLista = null;
  let listaObservada = null;
  let aplicando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

  function processoPermitido(valor) {
    const nome = normalizar(valor);
    return nome === "LATERAL" || nome.includes("ENCAPAR BOJO");
  }

  function injetarEstilo() {
    if (document.getElementById("styleProcessosSomenteValores61")) return;
    const style = document.createElement("style");
    style.id = "styleProcessosSomenteValores61";
    style.textContent = `
      #${PAGINA_ID} > .${CLASSE_OCULTA}{display:none!important}
      #${PAGINA_ID} .cn61-processo-nao-usado{display:none!important}
      #${PAGINA_ID} .cn61-intro{margin-bottom:16px;padding:15px 17px;border:1px solid #c4b5fd;border-radius:15px;background:linear-gradient(135deg,#faf5ff,#fff);color:#4c1d95}
      #${PAGINA_ID} .cn61-intro h3{margin:0 0 5px;color:#3b0764;font-size:17px}
      #${PAGINA_ID} .cn61-intro p{margin:0;color:#6b21a8;font-size:12px;line-height:1.45}
      #${PAGINA_ID} #configSutiaCompleto51{margin-bottom:16px}
      #${PAGINA_ID} .processos-valores-title strong{font-size:14px}
      #${PAGINA_ID} .processos-valores-title span{font-size:11px}
    `;
    document.head.appendChild(style);
  }

  function filhoDiretoDaPagina(elemento, pagina) {
    let atual = elemento;
    while (atual?.parentElement && atual.parentElement !== pagina) atual = atual.parentElement;
    return atual?.parentElement === pagina ? atual : null;
  }

  function garantirIntroducao(pagina) {
    let intro = document.getElementById("processosValoresIntro61");
    if (intro) return intro;

    intro = document.createElement("div");
    intro.id = "processosValoresIntro61";
    intro.className = "cn61-intro";
    intro.innerHTML = `
      <h3>Gestão de valores da produção</h3>
      <p>Configure os valores gerais do Sutiã Completo e os valores por referência de LATERAL e ENCAPAR BOJO. Os demais processos continuam preservados no banco, mas não aparecem nesta tela.</p>`;
    pagina.prepend(intro);
    return intro;
  }

  function focarEstrutura() {
    const pagina = document.getElementById(PAGINA_ID);
    if (!pagina || aplicando) return false;

    aplicando = true;
    try {
      injetarEstilo();
      const introducao = garantirIntroducao(pagina);
      const permitidos = new Set([introducao]);

      [
        document.getElementById("configSutiaCompleto51"),
        document.getElementById("formPrecoReferencia"),
        document.getElementById("listaProcessosValores"),
        document.getElementById("tituloTabelaValores"),
        document.getElementById("buscaProcessoValor")
      ].filter(Boolean).forEach(elemento => {
        const filho = filhoDiretoDaPagina(elemento, pagina);
        if (filho) permitidos.add(filho);
      });

      [...pagina.children].forEach(filho => {
        filho.classList.toggle(CLASSE_OCULTA, !permitidos.has(filho));
      });

      const titulo = document.getElementById("pageTitle");
      const subtitulo = document.getElementById("pageSubtitle");
      if (pagina.classList.contains("active")) {
        if (titulo) titulo.textContent = "Valores de produção";
        if (subtitulo) subtitulo.textContent = "Gerencie Sutiã Completo, referência 912, fecho, ponto de luz, Lateral e Encapar Bojo.";
      }

      filtrarControles();
      observarLista();
      return permitidos.size > 1;
    } finally {
      aplicando = false;
    }
  }

  function filtrarLista() {
    const lista = document.getElementById("listaProcessosValores");
    if (!lista) return;

    [...lista.children].forEach(item => {
      const permitido = processoPermitido(item.textContent);
      item.classList.toggle("cn61-processo-nao-usado", !permitido);
    });

    const titulo = lista.closest("aside")?.querySelector(".processos-valores-title");
    const forte = titulo?.querySelector("strong");
    const ajuda = titulo?.querySelector("span");
    if (forte) forte.textContent = "Valores por referência";
    if (ajuda) ajuda.textContent = "Escolha Lateral ou Encapar Bojo.";

    const selecionado = normalizar(document.getElementById("valorProcessoSelecionadoLabel")?.textContent);
    if (!processoPermitido(selecionado)) {
      const primeiro = [...lista.children].find(item => !item.classList.contains("cn61-processo-nao-usado"));
      const botao = primeiro?.matches("button") ? primeiro : primeiro?.querySelector("button");
      if (botao && botao.dataset.cn61Selecionado !== "1") {
        botao.dataset.cn61Selecionado = "1";
        window.setTimeout(() => botao.click(), 0);
      }
    }
  }

  function filtrarSelectProcesso() {
    const select = document.getElementById("precoReferenciaProcesso");
    if (!(select instanceof HTMLSelectElement)) return;

    [...select.options].forEach(option => {
      const valor = normalizar(option.value || option.textContent);
      const auxiliar = !valor || valor.includes("SELECIONE") || valor.includes("ESCOLHA");
      option.hidden = !auxiliar && !processoPermitido(valor);
      option.disabled = !auxiliar && !processoPermitido(valor);
    });

    if (select.value && !processoPermitido(select.value)) {
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function filtrarControles() {
    filtrarLista();
    filtrarSelectProcesso();

    const busca = document.getElementById("buscaProcessoValor");
    if (busca) busca.placeholder = "Buscar Lateral ou Encapar Bojo...";

    const tituloTabela = document.getElementById("tituloTabelaValores");
    if (tituloTabela && /VALOR|PROCESSO/i.test(tituloTabela.textContent)) {
      tituloTabela.textContent = "Valores de Lateral e Encapar Bojo por referência";
    }
  }

  function observarLista() {
    const lista = document.getElementById("listaProcessosValores");
    if (!lista || listaObservada === lista) return;

    observadorLista?.disconnect();
    listaObservada = lista;
    observadorLista = new MutationObserver(() => {
      window.setTimeout(() => {
        filtrarLista();
        filtrarSelectProcesso();
      }, 0);
    });
    observadorLista.observe(lista, { childList: true });
  }

  function aplicarDepois(atrasos = [80, 300, 750]) {
    atrasos.forEach(atraso => window.setTimeout(focarEstrutura, atraso));
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest('[data-page="processos"]')) aplicarDepois([50, 250, 650, 1200]);
      if (alvo.closest("#listaProcessosValores")) aplicarDepois([20, 150]);
    }, true);

    document.addEventListener("change", event => {
      if (event.target?.id === "precoReferenciaProcesso") filtrarSelectProcesso();
    }, true);

    document.addEventListener("submit", event => {
      if (event.target?.id === "formPrecoReferencia" || event.target?.id === "configSutiaCompleto51") {
        aplicarDepois([300, 900]);
      }
    }, true);
  }

  function iniciar() {
    instalarEventos();
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      focarEstrutura();
      if (tentativas >= 35 || (document.getElementById("configSutiaCompleto51") && document.getElementById("formPrecoReferencia"))) {
        window.clearInterval(intervalo);
        aplicarDepois([300, 900]);
      }
    }, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
