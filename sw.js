const REMOVAL_VERSION = "2026-07-30-modo-web-sem-pwa-15";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const chaves = await caches.keys();
      await Promise.all(
        chaves
          .filter(chave => chave.startsWith("op-confeccao-"))
          .map(chave => caches.delete(chave))
      );
    } catch (error) {}

    try {
      await self.registration.unregister();
    } catch (error) {}

    const clientes = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    clientes.forEach(cliente => {
      cliente.postMessage({
        type: "CORPONU_PWA_REMOVIDO",
        version: REMOVAL_VERSION
      });
    });
  })());
});

// Sem interceptação de requisições: o sistema passa a funcionar somente online.
