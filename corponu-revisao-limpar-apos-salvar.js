(() => {
  "use strict";

  const VERSION = "2026-07-31-revisao-manter-aberta-56";

  if (window.__CORPONU_REVISAO_LIMPAR_APOS_SALVAR__ === VERSION) return;
  window.__CORPONU_REVISAO_LIMPAR_APOS_SALVAR__ = VERSION;

  let verificacaoAtual = 0;

  const texto = valor => String(valor ?? "").trim();

  function millis(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.toDate === "function") return valor.toDate().getTime();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  function mostrarAviso(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    window.clearTimeout(window.__revLimparToast56);
    window.__revLimparToast56 = window.setTimeout(() => toast.classList.add("hidden"), 4500);
  }

  function manterPaginaRevisaoAtiva() {
    const pagina = document.getElementById("revisaoComponentes");
    if (pagina) {
      pagina.classList.remove("hidden");
      pagina.classList.add("active");
      pagina.hidden = false;
      pagina.style.removeProperty("display");
    }

    const botaoNav = document.querySelector('#appShell .sidebar .nav-btn[data-page="revisao-componentes"]');
    if (botaoNav) {
      document.querySelectorAll("#appShell .sidebar .nav-btn").forEach(botao => botao.classList.remove("active"));
      botaoNav.classList.add("active");
    }

    const titulo = document.getElementById("pageTitle");
    const subtitulo = document.getElementById("pageSubtitle");
    if (titulo) titulo.textContent = "Revisão lateral e bojo";
    if (subtitulo) subtitulo.textContent = "Componentes feitos pela confecção e descontos nos pagamentos pendentes.";
  }

  function limparTelaParaProximaOP() {
    const form = document.getElementById("formRevisaoComponentes");
    if (form) form.reset();

    const numero = document.getElementById("revNumeroOP");
    if (numero) {
      numero.value = "";
      numero.dispatchEvent(new Event("input", { bubbles: true }));
      numero.dispatchEvent(new Event("change", { bubbles: true }));
    }

    ["revLateralQuemFez", "revBojoQuemFez"].forEach(id => {
      const campo = document.getElementById(id);
      if (!campo) return;
      campo.value = "";
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    });

    ["revLateral", "revBojo"].forEach(id => {
      const campo = document.getElementById(id);
      if (!campo) return;
      campo.checked = false;
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    });

    document.getElementById("revPreview")?.classList.add("hidden");
    document.getElementById("revBox")?.classList.add("hidden");

    manterPaginaRevisaoAtiva();

    window.setTimeout(() => {
      manterPaginaRevisaoAtiva();
      numero?.focus();
      mostrarAviso("Revisão salva. Digite a próxima OP.");
    }, 80);
  }

  async function aguardarConfirmacaoSalva(dados, chave) {
    const api = window.CorpoNuRevisaoComponentes;
    if (!dados.numero || typeof api?.buscarOP !== "function") return;

    for (let tentativa = 0; tentativa < 24; tentativa += 1) {
      if (chave !== verificacaoAtual) return;
      await new Promise(resolve => window.setTimeout(resolve, tentativa === 0 ? 550 : 300));

      try {
        const op = await api.buscarOP(dados.numero);
        if (!op) continue;

        const revisao = op.revisaoComponentesConfeccao || {};
        const atualizadoEm = millis(
          revisao.atualizadoEm ||
          revisao.criadoEm ||
          op.revisaoComponentesAtualizadaEm
        );

        const estadoConfere = revisao.ativa === true &&
          revisao.lateralFeita === dados.lateral &&
          revisao.bojoFeito === dados.bojo;

        const pertenceAoSalvamentoAtual = atualizadoEm >= dados.iniciadoEm - 1800;

        if (estadoConfere && pertenceAoSalvamentoAtual) {
          limparTelaParaProximaOP();
          return;
        }
      } catch (error) {
        if (tentativa >= 23) {
          console.warn("A revisão foi enviada, mas não foi possível confirmar a limpeza automática da tela.", error);
        }
      }
    }
  }

  function instalarEvento() {
    const form = document.getElementById("formRevisaoComponentes");
    if (!form || form.dataset.limparAposSalvar56 === "1") return false;

    form.dataset.limparAposSalvar56 = "1";
    form.addEventListener("submit", () => {
      const numero = texto(document.getElementById("revNumeroOP")?.value);
      if (!numero) return;

      const dados = {
        numero,
        lateral: document.getElementById("revLateral")?.checked === true,
        bojo: document.getElementById("revBojo")?.checked === true,
        iniciadoEm: Date.now()
      };

      verificacaoAtual += 1;
      const chave = verificacaoAtual;
      aguardarConfirmacaoSalva(dados, chave).catch(error => {
        console.warn("Não foi possível acompanhar a confirmação da revisão.", error);
      });
    }, true);

    return true;
  }

  function iniciar() {
    if (instalarEvento()) return;

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (instalarEvento() || tentativas >= 30) window.clearInterval(intervalo);
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
