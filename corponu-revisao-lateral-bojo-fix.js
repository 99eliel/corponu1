(() => {
  "use strict";

  const VERSION = "2026-07-30-revisao-tela-segura-20";
  const PAGINA = "revisaoComponentes";
  const NAV = "revisao-componentes";
  const MODULO = "corponu-revisao-lateral-bojo.js";

  if (window.__CORPONU_FIX_REVISAO_TELA__ === VERSION) return;
  window.__CORPONU_FIX_REVISAO_TELA__ = VERSION;

  let reiniciando = false;

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

  function reiniciarModulo() {
    if (reiniciando || window.CorpoNuRevisaoComponentes?.versao) return;
    if (!criarPagina() || !garantirBotao()) return;

    reiniciando = true;
    window.__CORPONU_REVISAO_COMPONENTES__ = null;
    delete document.documentElement.dataset.eventosRevisaoComponentes;

    const script = document.createElement("script");
    script.src = `./${MODULO}?fix=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuReinicioRevisao = VERSION;
    script.onload = () => {
      reiniciando = false;
      document.documentElement.dataset.revisaoTelaPronta = VERSION;
    };
    script.onerror = () => {
      reiniciando = false;
      console.error("Não foi possível reiniciar a área Revisão lateral e bojo.");
    };
    document.head.appendChild(script);
  }

  function preparar() {
    garantirBotao();
    if (criarPagina()) reiniciarModulo();
  }

  // Trava de segurança: o clique não chega ao menu principal enquanto a página
  // ainda não existir. Assim nenhuma outra tela é escondida por engano.
  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const botao = alvo?.closest(`[data-page="${NAV}"]`);
    if (!botao) return;

    if (!document.getElementById(PAGINA) || !window.CorpoNuRevisaoComponentes?.versao) {
      event.preventDefault();
      event.stopImmediatePropagation();
      preparar();
      setTimeout(() => botao.click(), 250);
    }
  }, true);

  preparar();

  let tentativas = 0;
  const timer = setInterval(() => {
    tentativas += 1;
    preparar();
    if (window.CorpoNuRevisaoComponentes?.versao || tentativas >= 40) clearInterval(timer);
  }, 250);

  new MutationObserver(preparar).observe(document.documentElement, { childList: true, subtree: true });
})();
