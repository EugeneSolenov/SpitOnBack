const { execFile } = require("child_process");

const nginxUrl = process.env.NGINX_URL || "http://127.0.0.1:8080";
const haproxyUrl = process.env.HAPROXY_URL || "http://127.0.0.1:8081";

function runDockerCompose(args) {
  return new Promise((resolve, reject) => {
    execFile("docker", ["compose", ...args], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForBackup(targetName, targetUrl) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(targetUrl);
      const body = await response.json();

      if (response.ok && body.instance === "backend-backup") {
        console.log(`${targetName}: fallback response from ${body.instance}`);
        return;
      }
    } catch (error) {
      await delay(1000);
    }
  }

  throw new Error(`${targetName} did not switch to backend-backup`);
}

async function run() {
  try {
    await runDockerCompose(["stop", "backend1", "backend2"]);
    await delay(3000);

    await waitForBackup("Nginx", nginxUrl);
    await waitForBackup("HAProxy", haproxyUrl);

    console.log("Failover test passed");
  } finally {
    await runDockerCompose(["start", "backend1", "backend2"]);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
