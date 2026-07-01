(() => {
  const APP_VERSION = "2026-07-01-fix-pagamento-manejo-1";
  const STORAGE_KEY = "op_confeccao_app_version";
  let refreshing = false;

  function showUpdateToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.right = "18px";
    toast.style.bottom = "18px";
    toast.style.zIndex = "99999";
    toast.style.background = "#111827";
    toast.style.color = "#fff";
    toast.style.padding = "12px 14px";
    toast.style.borderRadius = "14px";
    toast.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.25)";
    toast.style.fontFamily = "Arial, sans-serif";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "800";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  function rememberVersion() {
    try {
      const previous = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, APP_VERSION);

      if (previous && previous !== APP_VERSION) {
        showUpdateToast("Sistema atualizado para a versão mais recente.");
      }
    } catch (error) {
      console.warn("Não foi possível salvar versão do sistema.", error);
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`, {
        updateViaCache: "none"
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);
    } catch (error) {
      console.warn("Service Worker não registrado.", error);
    }
  }

  async function checkVersionFile() {
    try {
      const response = await fetch(`version.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
      if (!response.ok) return;

      const data = await response.json();
      const remoteVersion = data?.version;

      if (remoteVersion && remoteVersion !== APP_VERSION) {
        showUpdateToast("Nova versão encontrada. Atualizando...");
        setTimeout(() => {
          window.location.reload();
        }, 700);
      }
    } catch (error) {
      console.warn("Não foi possível verificar atualização.", error);
    }
  }

  window.addEventListener("load", () => {
    rememberVersion();
    registerServiceWorker();
    checkVersionFile();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkVersionFile();
  });
})();
