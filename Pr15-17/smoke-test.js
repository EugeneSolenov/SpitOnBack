const { spawn } = require("child_process");

const PORT = 4311;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);

      if (response.ok) {
        return;
      }
    } catch (error) {
      await delay(250);
    }
  }

  throw new Error("Server did not start in time");
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const server = spawn("node", ["server.js"], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      DISABLE_HTTPS: "1",
    },
    stdio: "ignore",
  });

  try {
    await waitForServer();

    const health = await fetch(`${BASE_URL}/api/health`).then((response) => response.json());
    expect(health.status === "ok", "Health endpoint should return ok");

    const indexResponse = await fetch(`${BASE_URL}/`);
    const indexHtml = await indexResponse.text();
    expect(indexResponse.status === 200, "Index page should be available");
    expect(indexHtml.includes("Заметки"), "Index should contain the app title");
    expect(indexHtml.includes("app-content"), "Index should include the App Shell container");

    const homeResponse = await fetch(`${BASE_URL}/content/home.html`);
    const homeHtml = await homeResponse.text();
    expect(homeResponse.status === 200, "Home fragment should be available");
    expect(homeHtml.includes("note-form"), "Home fragment should contain the note form");
    expect(homeHtml.includes("note-reminder"), "Home fragment should contain the reminder field");

    const aboutResponse = await fetch(`${BASE_URL}/content/about.html`);
    const aboutHtml = await aboutResponse.text();
    expect(aboutResponse.status === 200, "About fragment should be available");
    expect(aboutHtml.includes("О приложении"), "About fragment should be available");

    const appResponse = await fetch(`${BASE_URL}/app.js`);
    const appBody = await appResponse.text();
    expect(appResponse.status === 200, "app.js should be available");
    expect(appBody.includes("subscribeToPush"), "Client should contain push subscription logic");
    expect(appBody.includes("window.io"), "Client should initialize Socket.IO");

    const workerResponse = await fetch(`${BASE_URL}/sw.js`);
    const workerBody = await workerResponse.text();
    expect(workerResponse.status === 200, "sw.js should be available");
    expect(workerBody.includes("dynamic-content-v3"), "Service worker should cache dynamic content");
    expect(workerBody.includes("self.addEventListener(\"push\""), "Service worker should handle push events");
    expect(workerBody.includes("snooze"), "Service worker should support snoozing reminders");

    const manifest = await fetch(`${BASE_URL}/manifest.json`).then((response) => response.json());
    expect(manifest.name === "Заметки", "Manifest should contain the updated app name");
    expect(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Manifest should declare icons");

    const socketClientResponse = await fetch(`${BASE_URL}/socket.io/socket.io.js`);
    const socketClientBody = await socketClientResponse.text();
    expect(socketClientResponse.status === 200, "Socket.IO client script should be served");
    expect(socketClientBody.includes("Socket"), "Socket.IO client script should contain the client bundle");

    const publicKeyResponse = await fetch(`${BASE_URL}/api/push/public-key`);
    const publicKeyPayload = await publicKeyResponse.json();
    expect(Boolean(publicKeyPayload.publicKey), "Server should expose the public VAPID key");

    const subscribeResponse = await fetch(`${BASE_URL}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "https://example.test/push/1",
        keys: {
          auth: "auth",
          p256dh: "key",
        },
      }),
    });
    expect(subscribeResponse.status === 201, "Subscribe endpoint should accept a valid subscription");

    const unsubscribeResponse = await fetch(`${BASE_URL}/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "https://example.test/push/1",
      }),
    });
    expect(unsubscribeResponse.status === 200, "Unsubscribe endpoint should remove a subscription");

    const snoozeResponse = await fetch(`${BASE_URL}/snooze?reminderId=missing`, {
      method: "POST",
    });
    expect(snoozeResponse.status === 404, "Snooze endpoint should return 404 for an unknown reminder");

    console.log("Smoke test passed");
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
