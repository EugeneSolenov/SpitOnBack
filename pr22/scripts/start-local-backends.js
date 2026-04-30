const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const instances = [
  { name: "backend-1", port: 3200 },
  { name: "backend-2", port: 3201 },
  { name: "backend-backup", port: 3202 },
];

const children = instances.map((instance) => {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      INSTANCE_NAME: instance.name,
      PORT: String(instance.port),
    },
    stdio: "inherit",
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
