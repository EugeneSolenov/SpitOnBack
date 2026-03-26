const { spawn } = require("child_process");

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  for (let index = 0; index < 30; index += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);

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
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });

  try {
    await waitForServer();

    const indexResponse = await fetch(`${BASE_URL}/`);
    const indexHtml = await indexResponse.text();
    expect(indexResponse.status === 200, "Index page should be served");
    expect(indexHtml.includes("Заметки"), "Index page should contain notes heading");

    const scriptResponse = await fetch(`${BASE_URL}/app.js`);
    const scriptBody = await scriptResponse.text();
    expect(scriptResponse.status === 200, "app.js should be available");
    expect(scriptBody.includes("registerServiceWorker"), "app.js should register the service worker");

    const workerResponse = await fetch(`${BASE_URL}/sw.js`);
    const workerBody = await workerResponse.text();
    expect(workerResponse.status === 200, "sw.js should be available");
    expect(workerBody.includes("self.addEventListener(\"fetch\""), "Service worker should handle fetch events");

    const manifestResponse = await fetch(`${BASE_URL}/manifest.json`);
    expect(manifestResponse.status === 200, "Manifest should be available");

    const manifest = await manifestResponse.json();
    expect(manifest.name === "Мои заметки", "Manifest should define app name");
    expect(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Manifest should include PNG icons");

    const iconResponse = await fetch(`${BASE_URL}/icons/icon-192.png`);
    expect(iconResponse.status === 200, "PWA icon should be available");

    console.log("Smoke test passed");
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
