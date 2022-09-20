/* eslint-env serviceworker */
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  void(self.skipWaiting());
  return;
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  return;
});

export {};
