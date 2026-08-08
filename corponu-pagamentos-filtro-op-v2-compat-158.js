(() => {
  "use strict";

  const VERSION = "2026-08-08-pagamentos-filtro-op-v2-compat-158";
  const VERSAO_FILTRO_ANTIGO = "2026-08-02-filtro-op-pagamentos-90";
  const INPUT_ID = "pagamentoFiltroOP";
  const LABEL_ID = "pagamentoFiltroOPLabel";

  if (window.__CORPONU_PAGAMENTOS_FILTRO_OP_OWNER__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_FILTRO_OP_OWNER__ = VERSION;

  // O módulo legado verifica esta flag antes de registrar seus eventos.
  // Mantemos o valor que ele espera para que saia imediatamente e não dispute
  // o mesmo campo com o filtro leve 157.
  window.__CORPONU_PAGAMENTOS_FILTRO_OP__ = VERSAO_FILTRO_ANTIGO;

  function montarCampo() {
    const filtros = document.querySelector("#pagamentos .pagamento-filtros-entregas");
    if (!filtros) return false;

    const existente = document.getElementById(INPUT_ID);
    if (existente) {
      existente.setAttribute("autocomplete", "off");
      existente.setAttribute("inputmode", "numeric");
      existente.setAttribute("aria-label", "Filtrar pagamentos pelo número da OP");
      return true;
    }

    const label = document.createElement("label");
    label.id = LABEL_ID;
    label.dataset.corponuFiltroOpOwner = VERSION;
    label.innerHTML = `Nº OP
      <input id="${INPUT_ID}" type="text" inputmode="numeric" autocomplete="off" placeholder="Digite a OP" aria-label="Filtrar pagamentos pelo número da OP">
      <small style="display:block;margin-top:4px;opacity:.72">Busca direta no Firebase somente desta OP.</small>`;

    const faccao = document.getElementById("pagamentoFiltroFaccao")?.closest("label");
    if (faccao) faccao.insertAdjacentElement("beforebegin", label);
    else filtros.prepend(label);
    return true;
  }

  function iniciar() {
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      if (montarCampo() || tentativas >= 60) return;
      window.setTimeout(tentar, 200);
    };
    tentar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();