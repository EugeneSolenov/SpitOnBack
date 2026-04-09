const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const express = require("express");
const cors = require("cors");
const selfsigned = require("selfsigned");
const { randomUUID } = require("crypto");
const { Server } = require("socket.io");
const webpush = require("web-push");

const ROOT_DIR = __dirname;
const HOST = process.env.HOST || "0.0.0.0";
const HTTP_PORT = Number(process.env.PORT) || 3001;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const DISABLE_HTTPS = process.env.DISABLE_HTTPS === "1" || HTTPS_PORT <= 0;
const MAILTO = process.env.VAPID_MAILTO || "mailto:student@example.com";
const CERT_FILE = path.join(ROOT_DIR, "localhost.pem");
const KEY_FILE = path.join(ROOT_DIR, "localhost-key.pem");
const SNOOZE_DELAY_MS = 5 * 60 * 1000;

const vapidKeys = {
  publicKey: "BCjVXQOJktqsqfV_8LDqZeWmIs3rRnLQAA-UFXMJT4EtY6Uat2LaE9fDpBDwWhzunqFcrS4jNsTgaH8cJK1ehWk",
  privateKey: "CHNcGSwb_kSwHIxUp_GMKRskuGoMIw1Ufo5dBsM7oM8",
};

webpush.setVapidDetails(MAILTO, vapidKeys.publicKey, vapidKeys.privateKey);

const app = express();
const subscriptions = new Map();
const reminders = new Map();
const ioServers = [];
const liveServers = [];

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    subscriptions: subscriptions.size,
    reminders: reminders.size,
  });
});

app.get("/api/push/public-key", (_request, response) => {
  response.json({ publicKey: vapidKeys.publicKey });
});

app.post("/subscribe", (request, response) => {
  const subscription = request.body;

  if (!subscription?.endpoint) {
    response.status(400).json({ message: "Некорректная push-подписка" });
    return;
  }

  subscriptions.set(subscription.endpoint, subscription);
  response.status(201).json({
    message: "Подписка сохранена",
    total: subscriptions.size,
  });
});

app.post("/unsubscribe", (request, response) => {
  const endpoint = request.body?.endpoint;

  if (!endpoint) {
    response.status(400).json({ message: "Endpoint обязателен" });
    return;
  }

  subscriptions.delete(endpoint);
  response.json({
    message: "Подписка удалена",
    total: subscriptions.size,
  });
});

app.post("/snooze", (request, response) => {
  const reminderId = String(request.query.reminderId || request.body?.reminderId || "").trim();

  if (!reminderId || !reminders.has(reminderId)) {
    response.status(404).json({ error: "Reminder not found" });
    return;
  }

  const reminder = reminders.get(reminderId);

  if (reminder.timeoutId) {
    clearTimeout(reminder.timeoutId);
  }

  const reminderTime = Date.now() + SNOOZE_DELAY_MS;
  const timeoutId = setTimeout(() => {
    void triggerReminder(reminderId, "Напоминание отложено");
  }, SNOOZE_DELAY_MS);

  reminders.set(reminderId, {
    ...reminder,
    reminderTime,
    timeoutId,
  });

  response.status(200).json({
    message: "Reminder snoozed for 5 minutes",
    reminderTime,
  });
});

app.use(
  express.static(ROOT_DIR, {
    extensions: ["html"],
    setHeaders(response, filePath) {
      if (path.basename(filePath) === "sw.js") {
        response.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.get("/", (_request, response) => {
  response.sendFile(path.join(ROOT_DIR, "index.html"));
});

async function createHttpsCredentials() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return {
      key: fs.readFileSync(KEY_FILE),
      cert: fs.readFileSync(CERT_FILE),
      source: "local certificate files",
    };
  }

  const generated = await selfsigned.generate(
    [{ name: "commonName", value: "localhost" }],
    {
      algorithm: "sha256",
      keySize: 2048,
      notBeforeDate: new Date(),
      notAfterDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      extensions: [
        {
          name: "subjectAltName",
          altNames: [
            { type: 2, value: "localhost" },
            { type: 7, ip: "127.0.0.1" },
            { type: 7, ip: "::1" },
          ],
        },
      ],
    }
  );

  return {
    key: generated.private,
    cert: generated.cert,
    source: "generated self-signed certificate",
  };
}

function normalizeReminderTimestamp(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const timestamp =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) || Date.parse(value) : NaN;

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp;
}

function createNotePayload(note) {
  if (!note || typeof note !== "object") {
    return null;
  }

  const title = String(note.title || "").trim().slice(0, 80);
  const body = String(note.body || "").trim().slice(0, 600);

  if (!title && !body) {
    return null;
  }

  return {
    id: String(note.id || randomUUID()),
    title: title || "Без названия",
    body,
    reminder: normalizeReminderTimestamp(note.reminder),
    createdAt:
      typeof note.createdAt === "string" && !Number.isNaN(Date.parse(note.createdAt))
        ? note.createdAt
        : new Date().toISOString(),
    clientId: String(note.clientId || ""),
  };
}

function getReminderText(note) {
  const title = String(note?.title || "").trim();
  const body = String(note?.body || "").trim();

  if (title && body) {
    return `${title}: ${body}`.slice(0, 180);
  }

  return (title || body || "Напоминание").slice(0, 180);
}

async function sendPayloadToSubscription(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      subscriptions.delete(subscription.endpoint);
      return;
    }

    console.error("Push error:", error.message);
  }
}

function sendPayloadToAll(payload) {
  return Promise.all(
    [...subscriptions.values()].map((subscription) => sendPayloadToSubscription(subscription, payload))
  );
}

function emitSocketEvent(eventName, payload) {
  ioServers.forEach((io) => {
    io.emit(eventName, payload);
  });
}

function createNotePushPayload(note) {
  return {
    title: `Новая заметка: ${note.title}`,
    body: note.body ? note.body.slice(0, 120) : "Откройте приложение, чтобы посмотреть заметку.",
    url: "/",
  };
}

function createReminderPushPayload(reminderId, reminder, title = "Напоминание") {
  return {
    title,
    body: reminder.text,
    reminderId,
    url: "/",
  };
}

function broadcastNote(note) {
  emitSocketEvent("noteAdded", note);
  return sendPayloadToAll(createNotePushPayload(note));
}

function cancelReminder(reminderId) {
  const key = String(reminderId || "").trim();

  if (!key) {
    return false;
  }

  const existing = reminders.get(key);

  if (!existing) {
    return false;
  }

  if (existing.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  reminders.delete(key);
  return true;
}

function scheduleReminder(reminder) {
  const reminderId = String(reminder?.id || "").trim();
  const text = String(reminder?.text || "").trim();
  const reminderTime = normalizeReminderTimestamp(reminder?.reminderTime);

  if (!reminderId || !text || !reminderTime) {
    return false;
  }

  const delay = reminderTime - Date.now();

  if (delay <= 0) {
    return false;
  }

  const existing = reminders.get(reminderId);

  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  const timeoutId = setTimeout(() => {
    void triggerReminder(reminderId, "Напоминание");
  }, delay);

  reminders.set(reminderId, {
    id: reminderId,
    text,
    reminderTime,
    timeoutId,
  });

  return true;
}

async function triggerReminder(reminderId, title) {
  const key = String(reminderId || "").trim();
  const reminder = reminders.get(key);

  if (!reminder) {
    return;
  }

  const payload = createReminderPushPayload(key, reminder, title);
  emitSocketEvent("reminderTriggered", payload);
  await sendPayloadToAll(payload);

  reminders.set(key, {
    ...reminder,
    timeoutId: null,
    reminderTime: Date.now(),
  });
}

function attachSocketServer(server, label) {
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[${label}] Клиент подключён: ${socket.id}`);

    socket.on("newNote", async (note) => {
      const payload = createNotePayload(note);

      if (!payload) {
        return;
      }

      if (payload.reminder && payload.reminder > Date.now()) {
        scheduleReminder({
          id: payload.id,
          text: getReminderText(payload),
          reminderTime: payload.reminder,
        });
      }

      await broadcastNote(payload);
    });

    socket.on("newReminder", (reminder) => {
      scheduleReminder(reminder);
    });

    socket.on("cancelReminder", (reminder) => {
      cancelReminder(reminder?.id);
    });

    socket.on("disconnect", () => {
      console.log(`[${label}] Клиент отключён: ${socket.id}`);
    });
  });

  ioServers.push(io);
  return io;
}

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Получен ${signal}. Останавливаем серверы...`);

  reminders.forEach((reminder) => {
    if (reminder.timeoutId) {
      clearTimeout(reminder.timeoutId);
    }
  });

  const closeIo = Promise.all(
    ioServers.map(
      (io) =>
        new Promise((resolve) => {
          io.close(() => resolve());
        })
    )
  );

  closeIo.finally(() => {
    let remaining = liveServers.length;

    if (remaining === 0) {
      process.exit(0);
      return;
    }

    const timeout = setTimeout(() => {
      process.exit(0);
    }, 5000);

    timeout.unref();

    liveServers.forEach((server) => {
      server.close(() => {
        remaining -= 1;

        if (remaining === 0) {
          clearTimeout(timeout);
          process.exit(0);
        }
      });
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function startServers() {
  const httpServer = http.createServer(app);
  attachSocketServer(httpServer, "http");
  liveServers.push(httpServer);

  httpServer.listen(HTTP_PORT, HOST, () => {
    console.log(`HTTP server: http://localhost:${HTTP_PORT}`);
    console.log(`HTTP network: http://${HOST}:${HTTP_PORT}`);
  });

  if (!DISABLE_HTTPS) {
    const credentials = await createHttpsCredentials();
    const httpsServer = https.createServer(
      {
        key: credentials.key,
        cert: credentials.cert,
      },
      app
    );

    attachSocketServer(httpsServer, "https");
    liveServers.push(httpsServer);

    httpsServer.listen(HTTPS_PORT, HOST, () => {
      console.log(`HTTPS server: https://localhost:${HTTPS_PORT} (${credentials.source})`);
      console.log(`HTTPS network: https://${HOST}:${HTTPS_PORT}`);
      console.log("Чтобы использовать доверенный сертификат, положите localhost.pem и localhost-key.pem в корень проекта.");
    });
  }
}

startServers().catch((error) => {
  console.error("Не удалось запустить сервер:", error);
  process.exit(1);
});
