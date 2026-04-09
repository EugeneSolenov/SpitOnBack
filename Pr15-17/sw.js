const APP_SHELL_CACHE = "app-shell-v4";
const DYNAMIC_CACHE = "dynamic-content-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-64.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/socket.io/socket.io.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_SHELL_CACHE, DYNAMIC_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function handleAppShellNavigation(request) {
  const cachedShell = await caches.match("/index.html");

  if (cachedShell) {
    return cachedShell;
  }

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put("/index.html", networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return caches.match("/offline.html");
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    if (request.destination === "document") {
      return caches.match("/offline.html");
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

async function handleDynamicContent(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    return caches.match("/content/home.html");
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (url.pathname.startsWith("/socket.io/") && url.pathname !== "/socket.io/socket.io.js") {
    return;
  }

  if (url.pathname.startsWith("/content/")) {
    event.respondWith(handleDynamicContent(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleAppShellNavigation(event.request));
    return;
  }

  event.respondWith(handleStaticAsset(event.request));
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Новое уведомление",
    body: "Проверьте список заметок.",
    reminderId: null,
    url: "/",
  };

  if (event.data) {
    payload = {
      ...payload,
      ...event.data.json(),
    };
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-64.png",
    data: {
      reminderId: payload.reminderId || null,
      url: payload.url || "/",
    },
  };

  if (payload.reminderId) {
    options.actions = [{ action: "snooze", title: "Отложить на 5 минут" }];
  }

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const reminderId = notification.data?.reminderId;
  const targetUrl = notification.data?.url || "/";

  if (action === "snooze" && reminderId) {
    event.waitUntil(
      fetch(`/snooze?reminderId=${encodeURIComponent(reminderId)}`, { method: "POST" })
        .catch((error) => {
          console.error("Snooze failed:", error);
        })
        .finally(() => {
          notification.close();
        })
    );
    return;
  }

  notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => client.url.startsWith(self.location.origin));

      if (matchingClient) {
        return matchingClient.focus();
      }

      return clients.openWindow(targetUrl);
    })
  );
});
