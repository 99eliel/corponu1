(() => {
  const APP_VERSION = "2026-07-26-ligia-importacao-total-1";
  const STORAGE_KEY = "op_confeccao_app_version";
  const PROMPT_KEY = "op_confeccao_update_prompt_version";
  let refreshing = false;
  let updateBannerShown = false;

  function createButton(text, primary = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.border = primary ? "1px solid #2563eb" : "1px solid #d1d5db";
    button.style.background = primary ? "#2563eb" : "#ffffff";
    button.style.color = primary ? "#ffffff" : "#111827";
    button.style.borderRadius = "10px";
    button.style.padding = "8px 10px";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    return button;
  }

  function showToast(message) {
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

  function showUpdateBanner({ message, registration, worker, remoteVersion }) {
    if (updateBannerShown) return;
    updateBannerShown = true;

    try {
      if (remoteVersion) localStorage.setItem(PROMPT_KEY, remoteVersion);
    } catch (_) {}

    const banner = document.createElement("div");
    banner.id = "manual-update-banner";
    banner.style.position = "fixed";
    banner.style.left = "16px";
    banner.style.right = "16px";
    banner.style.bottom = "16px";
    banner.style.zIndex = "100000";
    banner.style.background = "#111827";
    banner.style.color = "#ffffff";
    banner.style.borderRadius = "18px";
    banner.style.boxShadow = "0 18px 48px rgba(15, 23, 42, 0.35)";
    banner.style.padding = "14px";
    banner.style.display = "flex";
    banner.style.gap = "12px";
    banner.style.alignItems = "center";
    banner.style.justifyContent = "space-between";
    banner.style.flexWrap = "wrap";
    banner.style.fontFamily = "Arial, sans-serif";

    const text = document.createElement("div");
    text.innerHTML = `<strong style="display:block;font-size:14px;margin-bottom:2px;">Atualização disponível</strong><span style="font-size:13px;opacity:.9;">${message}</span>`;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.alignItems = "center";

    const later = createButton("Depois", false);
    later.onclick = () => banner.remove();

    const update = createButton("Atualizar agora", true);
    update.onclick = () => {
      update.disabled = true;
      update.textContent = "Atualizando...";
      if (worker) {
        worker.postMessage({ type: "SKIP_WAITING" });
      } else if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
      setTimeout(() => window.location.reload(), 1200);
    };

    actions.append(later, update);
    banner.append(text, actions);
    document.body.appendChild(banner);
  }

  function rememberVersion() {
    try {
      const previous = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
      if (previous && previous !== APP_VERSION) {
        showToast("Sistema atualizado. Recarregamento automático desativado para evitar loop.");
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
        showUpdateBanner({
          message: "Existe uma versão nova pronta. Ela só será aplicada se você clicar.",
          registration,
          worker: registration.waiting,
          remoteVersion: APP_VERSION
        });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner({
              message: "Clique para aplicar a nova versão. O sistema não recarrega sozinho.",
              registration,
              worker: newWorker,
              remoteVersion: APP_VERSION
            });
          }
        });
      });

      // Checagem leve, sem recarregar e sem skipWaiting automático.
      setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
    } catch (error) {
      console.warn("Service Worker não registrado.", error);
    }
  }

  async function checkVersionFile() {
    try {
      const response = await fetch(`version.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const remoteVersion = data?.version;

      if (remoteVersion && remoteVersion !== APP_VERSION) {
        showUpdateBanner({
          message: `Foi encontrada a versão ${remoteVersion}. Ela não será aplicada automaticamente.`,
          remoteVersion
        });
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
