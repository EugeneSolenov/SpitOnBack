const os = require("os");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const INSTANCE_NAME = process.env.INSTANCE_NAME || `backend-${PORT}`;
const FORCE_UNHEALTHY = process.env.FORCE_UNHEALTHY === "true";
const startedAt = new Date().toISOString();

app.use(express.json());

function buildPayload(req) {
  return {
    message: "Response from backend server",
    instance: INSTANCE_NAME,
    port: PORT,
    pid: process.pid,
    hostname: os.hostname(),
    path: req.originalUrl,
    startedAt,
    timestamp: new Date().toISOString(),
  };
}

app.get("/health", (req, res) => {
  if (FORCE_UNHEALTHY) {
    return res.status(503).json({
      status: "unhealthy",
      instance: INSTANCE_NAME,
      port: PORT,
    });
  }

  return res.json({
    status: "ok",
    instance: INSTANCE_NAME,
    port: PORT,
  });
});

app.get("/", (req, res) => {
  return res.json(buildPayload(req));
});

app.get("/api/demo", (req, res) => {
  return res.json(buildPayload(req));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`${INSTANCE_NAME} started on port ${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
