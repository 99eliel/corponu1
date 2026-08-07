(() => {
  "use strict";

  const VERSION = "2026-08-07-informar-chegada-estavel-155";
  if (window.__CORPONU_INFORMAR_CHEGADA_155__ === VERSION) return;
  window.__CORPONU_INFORMAR_CHEGADA_155__ = VERSION;

  function instalarEstilo() {
    if (document.getElementById("corponu-informar-chegada-155-style")) return;

    const style = document.createElement("style");
    style.id = "corponu-informar-chegada-155-style";
    style.textContent = `
      body[data-chegada-perfil130="usuario"] #faccoes button[onclick*="registrarChegadaMovimentacao"]:not(:disabled),
      body[data-chegada-perfil130="usuario"] #faccoes button[data-avisar-chegada]:not(:disabled) {
        font-size: 0 !important;
      }

      body[data-chegada-perfil130="usuario"] #faccoes button[onclick*="registrarChegadaMovimentacao"]:not(:disabled)::after,
      body[data-chegada-perfil130="usuario"] #faccoes button[data-avisar-chegada]:not(:disabled)::after {
        content: "Informar chegada";
        font-size: 11px;
        line-height: 1.2;
      }
    `;
    document.head.appendChild(style);
  }

  function idDoBotao(botao) {
    const onclick = String(botao?.getAttribute("onclick") || "");
    return onclick.match(/registrarChegadaMovimentacao\s*\(\s*['\"]([^'\"]+)['\"]/i)?.[1] || "";
  }

  function usuarioComum() {
    return document.body?.dataset?.chegadaPerfil130 === "usuario";
  }

  function instalarProtecaoClique() {
    if (document.documentElement.dataset.informarChegada155 === "1") return;
    document.documentElement.dataset.informarChegada155 = "1";

    document.addEventListener("click", event => {
      if (!usuarioComum()) return;

      const alvo = event.target instanceof Element ? event.target : null;
      const botao = alvo?.closest('#faccoes button[onclick*="registrarChegadaMovimentacao"]');
      if (!botao || botao.dataset.avisarChegada) return;

      const id = idDoBotao(botao);
      if (!id) return;

      // Algumas linhas ainda podem nascer com o botão legado "Chegada".
      // Interrompe somente esse clique, marca a movimentação para o módulo 130
      // e repete o clique uma única vez já no fluxo operacional correto.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      botao.dataset.avisarChegada = id;
      botao.removeAttribute("onclick");

      window.setTimeout(() => botao.click(), 0);
    }, true);
  }

  instalarEstilo();
  instalarProtecaoClique();
})();
