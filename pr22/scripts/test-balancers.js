const targets = [
  {
    name: "Nginx",
    url: process.env.NGINX_URL || "http://127.0.0.1:8080",
  },
  {
    name: "HAProxy",
    url: process.env.HAPROXY_URL || "http://127.0.0.1:8081",
  },
];

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForTarget(target) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(target.url);

      if (response.ok) {
        return;
      }
    } catch (error) {
      await delay(500);
    }
  }

  throw new Error(`${target.name} is not available at ${target.url}`);
}

async function hitTarget(target, requestCount = 12) {
  await waitForTarget(target);

  const hits = [];

  for (let index = 0; index < requestCount; index += 1) {
    const response = await fetch(target.url);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(`${target.name} returned ${response.status}: ${JSON.stringify(body)}`);
    }

    hits.push(body.instance);
  }

  const uniqueInstances = [...new Set(hits)];
  console.log(`${target.name}: ${hits.join(" -> ")}`);

  if (uniqueInstances.length < 2) {
    throw new Error(`${target.name} did not distribute traffic between at least two backend servers`);
  }
}

async function run() {
  for (const target of targets) {
    await hitTarget(target);
  }

  console.log("Load balancing test passed");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
