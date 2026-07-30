(() => {
  if (window.__CORPONU_ATUALIZADOR_NOVO__) return;
  const LOCAL_RELEASE = "2026-07-30-lancamento-manual-pagamentos-restantes-1";
  const LEGACY_VERSION = "2026-07-29-restantes-faccoes-complementares-1";
  const STORAGE_KEY = "corponu_release_instalada";
  const RELOAD_KEY = "corponu_release_recarregada";
  const originalFetch = window.fetch.bind(window);
  window.__CORPONU_ATUALIZADOR_NOVO__ = LOCAL_RELEASE;

  // Mantém o verificador antigo quieto. As próximas versões são controladas
  // exclusivamente pelo corponu-release.json, sem apagar cache ou desregistrar o PWA.
  window.fetch = function(input, init) {
    try {
      const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
      if (url.pathname.endsWith("/version.json")) {
        return Promise.resolve(new Response(JSON.stringify({
          version: LEGACY_VERSION,
          updatedAt: "2026-07-29T23:59:00-03:00",
          notes: "Compatibilidade com o atualizador legado."
        }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }));
      }
    } catch (error) {}
    return originalFetch(input, init);
  };

  function toast(mensagem) {
    let el = document.getElementById("toastAtualizadorCorpoNu");
    if (!el) {
      el = document.createElement("div");
      el.id = "toastAtualizadorCorpoNu";
      Object.assign(el.style, {
        position: "fixed", right: "18px", bottom: "18px", zIndex: "100000",
        background: "#111827", color: "#fff", padding: "12px 14px",
        borderRadius: "13px", boxShadow: "0 12px 30px rgba(15,23,42,.28)",
        fontFamily: "Arial,sans-serif", fontSize: "13px", fontWeight: "800",
        maxWidth: "370px", lineHeight: "1.4"
      });
      document.body.appendChild(el);
    }
    el.textContent = mensagem;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 6000);
  }

  function recarregarUmaVez(versao) {
    const chave = `${RELOAD_KEY}_${versao}`;
    if (sessionStorage.getItem(chave) === "1") return;
    sessionStorage.setItem(chave, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("release", versao);
    url.searchParams.set("ts", Date.now().toString());
    window.location.replace(url.toString());
  }

  async function registrarWorker() {
    if (!("serviceWorker" in navigator)) return null;
    const registro = await navigator.serviceWorker.register(`sw.js?release=${encodeURIComponent(LOCAL_RELEASE)}`, { updateViaCache: "none" });
    navigator.serviceWorker.addEventListener("controllerchange", () => recarregarUmaVez(LOCAL_RELEASE));
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "CORPONU_UPDATE_READY") recarregarUmaVez(event.data.version || LOCAL_RELEASE);
    });
    if (registro.waiting) registro.waiting.postMessage({ type: "SKIP_WAITING" });
    registro.addEventListener("updatefound", () => {
      const worker = registro.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) worker.postMessage({ type: "SKIP_WAITING" });
      });
    });
    return registro;
  }

  async function verificarRelease(registro) {
    try {
      const resposta = await originalFetch(`corponu-release.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      const remota = String(dados?.version || "").trim();
      if (!remota) return;
      if (remota === LOCAL_RELEASE) {
        localStorage.setItem(STORAGE_KEY, remota);
        return;
      }
      toast("Nova versão encontrada. O sistema será atualizado e recarregado automaticamente.");
      await registro?.update().catch(() => {});
      if (registro?.waiting) registro.waiting.postMessage({ type: "SKIP_WAITING" });
      setTimeout(() => recarregarUmaVez(remota), 2200);
    } catch (error) {
      console.warn("Não foi possível verificar a nova versão do CorpoNu.", error);
    }
  }

  async function iniciar() {
    try {
      const registro = await registrarWorker();
      await verificarRelease(registro);
      setInterval(() => verificarRelease(registro), 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) verificarRelease(registro); });
      window.addEventListener("online", () => verificarRelease(registro));
    } catch (error) {
      console.warn("Atualizador automático do CorpoNu não iniciou.", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
