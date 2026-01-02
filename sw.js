const CACHE = "timer-pwa-v4001";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
];

// 安裝：只快取核心（不把帶 ?v= 的檔案寫死在清單）
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

// 對 app.js/app.css：network-first（有網路優先拿新檔；失敗才用快取）
function isAppAsset(url) {
  return url.pathname.endsWith("/app.js") || url.pathname.endsWith("/app.css");
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 只處理同網域
  if (url.origin !== location.origin) return;

  if (isAppAsset(url)) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(e.request, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put(e.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(e.request);
        return cached || fetch(e.request);
      }
    })());
    return;
  }

  // 其它資源：cache-first（快、離線友善）
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
