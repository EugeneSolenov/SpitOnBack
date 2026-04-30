require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT) || 3000;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires encrypted connections.
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());

function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function normalizeUser(row) {
  if (!row) {
    return row;
  }

  return {
    id: Number(row.id),
    first_name: row.first_name,
    last_name: row.last_name,
    age: Number(row.age),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function parseUserId(rawId) {
  const id = Number.parseInt(rawId, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateUserPayload(payload, { partial = false } = {}) {
  const errors = [];
  const allowedKeys = ["first_name", "last_name", "age"];
  const data = {};

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`Unsupported field: ${key}`);
    }
  }

  if (!partial || Object.hasOwn(payload, "first_name")) {
    if (typeof payload.first_name !== "string" || payload.first_name.trim() === "") {
      errors.push("first_name must be a non-empty string");
    } else {
      data.first_name = payload.first_name.trim();
    }
  }

  if (!partial || Object.hasOwn(payload, "last_name")) {
    if (typeof payload.last_name !== "string" || payload.last_name.trim() === "") {
      errors.push("last_name must be a non-empty string");
    } else {
      data.last_name = payload.last_name.trim();
    }
  }

  if (!partial || Object.hasOwn(payload, "age")) {
    if (!Number.isInteger(payload.age) || payload.age < 0) {
      errors.push("age must be a non-negative integer");
    } else {
      data.age = payload.age;
    }
  }

  if (partial && Object.keys(data).length === 0 && errors.length === 0) {
    errors.push("Provide at least one field to update");
  }

  return { errors, data };
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      age INTEGER NOT NULL CHECK (age >= 0),
      created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW())),
      updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()))
    );
  `);
}

app.get("/", async (req, res) => {
  res.json({
    message: "Practice work 19 API is running",
    endpoints: [
      "POST /api/users",
      "GET /api/users",
      "GET /api/users/:id",
      "PATCH /api/users/:id",
      "DELETE /api/users/:id",
    ],
  });
});

app.post("/api/users", async (req, res) => {
  const { errors, data } = validateUserPayload(req.body || {});

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const timestamp = getUnixTimestamp();
  const query = `
    INSERT INTO users (first_name, last_name, age, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [
    data.first_name,
    data.last_name,
    data.age,
    timestamp,
    timestamp,
  ];

  try {
    const result = await pool.query(query, values);
    return res.status(201).json(normalizeUser(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id;");
    return res.json(result.rows.map(normalizeUser));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  const id = parseUserId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "User id must be a positive integer" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1;", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  const id = parseUserId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "User id must be a positive integer" });
  }

  const { errors, data } = validateUserPayload(req.body || {}, { partial: true });

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  }

  fields.push(`updated_at = $${index}`);
  values.push(getUnixTimestamp());
  values.push(id);

  try {
    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${index + 1}
      RETURNING *;
    `;
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const id = parseUserId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "User id must be a positive integer" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id;", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "User deleted", id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, pool, initializeDatabase };

