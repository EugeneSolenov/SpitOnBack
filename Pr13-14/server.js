const http = require("http");
const fs = require("fs");
const net = require("net");
const path = require("path");

const DEFAULT_PORT = Number(process.env.PORT) || 4173;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function sendResponse(response, statusCode, contentType, body, extraHeaders = {}) {
  response.writeHead(statusCode, { "Content-Type": contentType, ...extraHeaders });
  response.end(body);
}

function resolveFilePath(urlPathname) {
  const safePath = path.normalize(urlPathname).replace(/^(\.\.[/\\])+/, "");
  const relativePath = safePath === path.sep || safePath === "." ? "index.html" : safePath.replace(/^[/\\]/, "");
  return path.join(ROOT_DIR, relativePath);
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(findAvailablePort(startPort + 1));
        return;
      }

      reject(error);
    });

    probe.once("listening", () => {
      probe.close(() => resolve(startPort));
    });

    probe.listen(startPort);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  let filePath = resolveFilePath(requestUrl.pathname);

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readError, fileBuffer) => {
      if (readError) {
        const fallbackPath = path.join(ROOT_DIR, "index.html");

        if (requestUrl.pathname !== "/" && request.headers.accept?.includes("text/html")) {
          fs.readFile(fallbackPath, (fallbackError, fallbackBuffer) => {
            if (fallbackError) {
              sendResponse(response, 404, "text/plain; charset=utf-8", "File not found");
              return;
            }

            sendResponse(response, 200, "text/html; charset=utf-8", fallbackBuffer);
          });

          return;
        }

        sendResponse(response, 404, "text/plain; charset=utf-8", "File not found");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      const extraHeaders = {};

      if (path.basename(filePath) === "sw.js") {
        extraHeaders["Cache-Control"] = "no-cache";
      }

      sendResponse(response, 200, contentType, fileBuffer, extraHeaders);
    });
  });
});

findAvailablePort(DEFAULT_PORT)
  .then((port) => {
    if (port !== DEFAULT_PORT) {
      console.warn(`Port ${DEFAULT_PORT} is busy. Using http://localhost:${port} instead.`);
    }

    server.listen(port, () => {
      console.log(`Practice 13 app is available at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    throw error;
  });
