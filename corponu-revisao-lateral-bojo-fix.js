(() => {
  "use strict";

  const VERSION = "2026-07-30-revisao-clique-direto-21";
  const PAGINA = "revisaoComponentes";
  const NAV = "revisao-componentes";
  const MODULO = "corponu-revisao-lateral-bojo.js";

  if (window.__CORPONU_FIX_REVISAO_TELA__ === VERSION) return;
  window.__CORPONU_FIX_REVISAO_TELA__ = VERSION;

  let moduloReiniciado = false;
  let carregandoModulo = false;

  function criarPagina() {
    if (document.getElementById(PAGINA)) return true;

    const main = document.querySelector("#appShell main.main");
    if (!main) return false;

    const secao = document.createElement("section");
    secao.id = PAGINA;
    secao.className = "page hidden";
    secao.innerHTML = `
      <div class="rev-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Registrar revisão da confecção</h3>
              <p>Localize a OP e marque se lateral e/ou bojo já foram feitos pela confecção.</p>
            </div>
          </div>
          <form id="formRevisaoComponentes" class="form">
            <div class="rev-busca">
              <label>Número da OP
                <input id="revNumeroOP" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 58466" required>
              </label>
              <button class="btn btn-primary" id="btnBuscarRevOP" type="button">Buscar OP</button>
            </div>
            <div id="revPreview" class="rev-preview hidden"></div>
            <div id="revBox" class="rev-box hidden">
              <div class="rev-opcoes">
                <label class="rev-opcao">
                  <input id="revLateral" type="checkbox">
                  <span><strong>Lateral feita pela confecção</strong><span>Desconta o valor configurado por peça.</span></span>
                </label>
                <label class="rev-opcao">
                  <input id="revBojo" type="checkbox">
                  <span><strong>Bojo encapado/pronto pela confecção</strong><span>Desconta o valor configurado por peça.</span></span>
                </label>
              </div>
              <div id="revResumo" class="rev-resumo"></div>
              <div class="actions">
                <button class="btn btn-success" type="submit">Salvar revisão</button>
                <button class="btn" id="btnLimparRev" type="button">Limpar</button>
              </div>
            </div>
          </form>
        </div>

        <form id="formConfigRev" class="panel rev-admin hidden">
          <div class="panel-header">
            <div>
              <h3>Valores dos descontos</h3>
              <p>Somente o administrador define os valores por peça.</p>
            </div>
          </div>
          <div class="rev-config">
            <label>Desconto da lateral
              <input id="revConfigLateral" type="number" min="0" step="0.01" placeholder="Em aberto">
            </label>
            <label>Desconto do bojo
              <input id="revConfigBojo" type="number" min="0" step="0.01" placeholder="Em aberto">
            </label>
          </div>
          <div class="rev-alerta">Os descontos são somados quando lateral e bojo estiverem marcados. Pagamentos pagos nunca são alterados.</div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Salvar valores e recalcular pendentes</button>
          </div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>OPs com revisão registrada</h3>
            <p>Veja componentes, usuário e data do registro.</p>
          </div>
          <div>
            <input id="buscaRevLista" class="search" type="text" placeholder="Buscar OP, referência ou cor...">
            <button class="btn" id="btnAtualizarRev" type="button">Atualizar</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OP</th><th>REF</th><th>Cor</th><th>Qtd.</th><th>Lateral</th><th>Bojo</th>
                <th>Desconto/peça</th><th>Registrado por</th><th>Data</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="listaRev">
              <tr><td colspan="10" class="rev-vazio">Carregue a área para ver as revisões.</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    const pagamentos = document.getElementById("pagamentos");
    if (pagamentos?.parentElement === main) main.insertBefore(secao, pagamentos);
    else main.appendChild(secao);

    return true;
  }

  function garantirBotao() {
    const nav = document.querySelector("#appShell .sidebar nav");
    if (!nav) return false;

    let botao = nav.querySelector(`[data-page="${NAV}"]`);
    if (!botao) {
      botao = document.createElement("button");
      botao.type = "button";
      botao.className = "nav-btn";
      botao.dataset.page = NAV;
      botao.textContent = "Revisão lateral e bojo";
      const pagamentos = nav.querySelector('[data-page="pagamentos"]');
      if (pagamentos) nav.insertBefore(botao, pagamentos);
      else nav.appendChild(botao);
    }

    botao.hidden = false;
    botao.classList.remove("hidden");
    botao.style.removeProperty("display");
    return true;
  }

  function abrirPaginaDireto() {
    if (!criarPagina()) return false;

    const pagina = document.getElementById(PAGINA);
    if (!pagina) return false;

    document.querySelectorAll("#appShell main.main > .page").forEach(secao => {
      secao.classList.remove("active");
      secao.classList.add("hidden");
    });

    pagina.classList.remove("hidden");
    pagina.classList.add("active");
    pagina.hidden = false;
    pagina.style.removeProperty("display");

    document.querySelectorAll("#appShell .sidebar .nav-btn").forEach(botao => botao.classList.remove("active"));
    document.querySelector(`#appShell .sidebar [data-page="${NAV}"]`)?.classList.add("active");

    const titulo = document.getElementById("pageTitle");
    const subtitulo = document.getElementById("pageSubtitle");
    if (titulo) titulo.textContent = "Revisão lateral e bojo";
    if (subtitulo) subtitulo.textContent = "Componentes feitos pela confecção e descontos nos pagamentos pendentes.";

    Promise.resolve(window.CorpoNuRevisaoComponentes?.carregarConfig?.()).catch(() => {});
    setTimeout(() => document.getElementById("revNumeroOP")?.focus(), 50);
    return true;
  }

  function reiniciarModuloUmaVez() {
    if (moduloReiniciado || carregandoModulo) return;
    if (!criarPagina() || !garantirBotao()) return;

    moduloReiniciado = true;
    carregandoModulo = true;

    window.__CORPONU_REVISAO_COMPONENTES__ = null;
    delete document.documentElement.dataset.eventosRevisaoComponentes;

    ["formRevisaoComponentes", "formConfigRev", "buscaRevLista", "btnAtualizarRev"].forEach(id => {
      document.getElementById(id)?.removeAttribute("data-rev");
    });

    const script = document.createElement("script");
    script.src = `./${MODULO}?fix=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuReinicioRevisao = VERSION;
    script.onload = () => {
      carregandoModulo = false;
      document.documentElement.dataset.revisaoTelaPronta = VERSION;
      if (document.querySelector(`[data-page="${NAV}"]`)?.classList.contains("active")) {
        abrirPaginaDireto();
      }
    };
    script.onerror = () => {
      carregandoModulo = false;
      moduloReiniciado = false;
      console.error("Não foi possível reiniciar a área Revisão lateral e bojo.");
    };
    document.head.appendChild(script);
  }

  function preparar() {
    garantirBotao();
    if (criarPagina()) reiniciarModuloUmaVez();
  }

  // Este clique é sempre controlado aqui. Ele nunca chega ao menu antigo,
  // portanto nenhuma tela pode ser escondida sem a nova área ser exibida.
  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const botao = alvo?.closest(`[data-page="${NAV}"]`);
    if (!botao) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    preparar();
    abrirPaginaDireto();
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preparar, { once: true });
  } else {
    preparar();
  }

  let tentativas = 0;
  const timer = setInterval(() => {
    tentativas += 1;
    preparar();
    if ((document.getElementById(PAGINA) && window.CorpoNuRevisaoComponentes?.versao) || tentativas >= 40) {
      clearInterval(timer);
    }
  }, 250);

  new MutationObserver(() => {
    garantirBotao();
    criarPagina();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();