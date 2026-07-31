(() => {
  "use strict";

  const LOCAL_RELEASE = "2026-07-31-faccoes-label-lateral-48";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const RELOAD_KEY = "corponu_web_release_recarregada";

  if (window.__CORPONU_ATUALIZADOR_WEB__ === LOCAL_RELEASE) return;
  window.__CORPONU_ATUALIZADOR_WEB__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;
  window.__corponuAutoUpdateIniciado = true;

  let verificando = false;

  function carregarScript(nomeArquivo, marcador, mensagemErro) {
    const existente = [...document.scripts].find(script => String(script.src || "").includes(nomeArquivo));
    if (existente) return existente;
    const script = document.createElement("script");
    script.src = `./${nomeArquivo}?v=${encodeURIComponent(LOCAL_RELEASE)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = marcador;
    script.onerror = () => console.error(mensagemErro);
    document.head.appendChild(script);
    return script;
  }

  function carregarModulos() {
    const modulos = [
      ["corponu-revisao-lateral-bojo-fix.js", "revisao-lateral-bojo-fix", "Não foi possível carregar a proteção da área Revisão lateral e bojo."],
      ["corponu-faccoes-corte.js", "faccoes-corte", "Não foi possível carregar a área interna das facções."],
      ["corponu-faccoes-grupos-processos.js", "faccoes-grupos-processos", "Não foi possível carregar os grupos de processos das facções."],
      ["corponu-faccoes-grupos-processos-integracao.js", "faccoes-grupos-processos-integracao", "Não foi possível concluir a integração dos grupos de facções."],
      ["corponu-faccoes-grupos-saida-fix.js", "faccoes-grupos-saida-fix", "Não foi possível carregar as facções habilitadas do processo."],
      ["corponu-faccoes-label-lateral.js", "faccoes-label-lateral", "Não foi possível aplicar o nome Lateral na área de facções."],
      ["corponu-pagamentos-interface.js", "pagamentos-interface", "Não foi possível carregar a organização visual de Pagamentos."],
      ["corponu-pagamentos-interface-fix.js", "pagamentos-interface-fix", "Não foi possível estabilizar a interface de Pagamentos."],
      ["corponu-pagamentos-manual-op-auto.js", "pagamentos-manual-op-auto", "Não foi possível carregar a busca automática da OP no lançamento manual."],
      ["corponu-pagamento-manual-componentes.js", "pagamento-manual-componentes", "Não foi possível carregar a definição de lateral e bojo no lançamento manual."],
      ["corponu-chegada-manual-visual.js", "chegada-manual-visual", "Não foi possível carregar a aparência da chegada manual."],
      ["corponu-pagamentos-multifiltro.js", "pagamentos-multifiltro-processos", "Não foi possível carregar a seleção de múltiplos processos."],
      ["corponu-pagamentos-multifiltro-visual.js", "pagamentos-multifiltro-visual", "Não foi possível carregar o acabamento visual do multifiltro."],
      ["corponu-pendencias-modal-estavel.js", "pendencias-modal-estavel", "Não foi possível restaurar a abertura das pendências de valores."]
    ];
    modulos.forEach(([arquivo, marcador, erro]) => carregarScript(arquivo, marcador, erro));
  }

  function removerAvisosAntigos() {
    ["corponuToastAtualizacaoAutomatica", "toastAtualizacaoSistema", "toastAtualizadorCorpoNu"]
      .forEach(id => document.getElementById(id)?.remove());
  }

  async function removerPwaAntigo() {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map(registro => registro.unregister()));
      }
    } catch (error) {
      console.warn("Não foi possível remover o service worker antigo.", error);
    }
    try {
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.filter(chave => chave.startsWith("op-confeccao-")).map(chave => caches.delete(chave)));
      }
    } catch (error) {
      console.warn("Não foi possível remover o cache antigo do PWA.", error);
    }
  }

  function recarregarUmaVez(versao) {
    const release = String(versao || "").trim();
    if (!release || release === LOCAL_RELEASE) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("release") === release) return;
    const chave = `${RELOAD_KEY}_${release}`;
    try {
      const ultima = Number(sessionStorage.getItem(chave) || 0);
      if (Date.now() - ultima < 30000) return;
      sessionStorage.setItem(chave, String(Date.now()));
    } catch (error) {}
    url.searchParams.set("release", release);
    url.searchParams.set("t", String(Date.now()));
    setTimeout(() => window.location.replace(url.toString()), 250);
  }

  async function verificarRelease() {
    if (verificando) return;
    verificando = true;
    try {
      const resposta = await fetch(`corponu-release.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      recarregarUmaVez(dados?.version);
    } catch (error) {
      console.warn("Não foi possível verificar a versão online do CorpoNu.", error);
    } finally {
      verificando = false;
    }
  }

  async function iniciar() {
    carregarModulos();
    removerAvisosAntigos();
    await removerPwaAntigo();
    await verificarRelease();
    setInterval(verificarRelease, INTERVALO_VERIFICACAO);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) verificarRelease(); });
    window.addEventListener("focus", verificarRelease);
    window.addEventListener("online", verificarRelease);
  }

  carregarModulos();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();