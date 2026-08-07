(() => {
  "use strict";

  const VERSION = "2026-08-07-faccoes-saida-atualizacao-imediata-143";

  if (window.__CORPONU_FACCOES_SAIDA_ATUALIZACAO_143__ === VERSION) return;
  window.__CORPONU_FACCOES_SAIDA_ATUALIZACAO_143__ = VERSION;

  let atualizando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const esperar = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  function paginaFaccoesAtiva() {
    const pagina = document.getElementById("faccoes");
    if (!pagina) return false;
    return pagina.classList.contains("active") || pagina.getClientRects().length > 0;
  }

  function opJaVisivel(numeroOP) {
    const alvo = normalizar(numeroOP);
    if (!alvo) return false;

    return [...document.querySelectorAll("#listaFaccoesMovimentacoes tr")].some(linha => {
      const primeira = linha.cells?.[0]?.textContent || "";
      return normalizar(primeira) === alvo;
    });
  }

  async function atualizarFaccoes(numeroOP) {
    if (atualizando || !paginaFaccoesAtiva() || opJaVisivel(numeroOP)) return;
    atualizando = true;

    try {
      if (typeof window.atualizarDadosServidorAgora === "function") {
        await Promise.resolve(window.atualizarDadosServidorAgora());
      } else {
        document.getElementById("btnAtualizarServidor")?.click();
      }

      // A função principal reinstala os listeners. Damos tempo para o primeiro
      // snapshot chegar e só repetimos uma vez se a nova OP ainda não estiver visível.
      for (let tentativa = 0; tentativa < 8; tentativa++) {
        await esperar(180);
        if (opJaVisivel(numeroOP)) return;
      }

      if (typeof window.atualizarDadosServidorAgora === "function") {
        await Promise.resolve(window.atualizarDadosServidorAgora());
      } else {
        document.getElementById("btnAtualizarServidor")?.click();
      }
    } catch (error) {
      console.warn("[Facções 143] Não foi possível atualizar a lista imediatamente.", error);
    } finally {
      atualizando = false;
    }
  }

  function aguardarConclusaoSaida(numeroOP) {
    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      const modal = document.getElementById("modalSaida3");

      // O fluxo atual fecha o modal somente depois que a gravação da saída terminou.
      if (modal?.classList.contains("hidden")) {
        window.clearInterval(timer);
        window.setTimeout(() => atualizarFaccoes(numeroOP), 120);
        return;
      }

      if (tentativas >= 40) window.clearInterval(timer);
    }, 100);
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "s3form") return;

    const numeroOP = String(document.getElementById("s3op")?.value || "").trim();
    const titulo = normalizar(document.getElementById("s3titulo")?.textContent || "");

    if (!numeroOP) return;

    // Lateral e Alça usam outra tabela e outra atualização. Aqui atuamos apenas
    // no fluxo principal das abas Sutiã e Calcinha.
    if (titulo.includes("LATERAL") || titulo.includes("CORTE")) return;

    aguardarConclusaoSaida(numeroOP);
  }, true);
})();
