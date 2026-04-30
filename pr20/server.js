require("dotenv").config({ quiet: true });

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = Number(process.env.PORT) || 3000;

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not set.");
}

app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
    },
    created_at: {
      type: Number,
      required: true,
    },
    updated_at: {
      type: Number,
      required: true,
    },
  },
  {
    collection: "users",
    id: false,
    versionKey: false,
  },
);

const counterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "counters",
    versionKey: false,
  },
);

const User = mongoose.model("User", userSchema);
const Counter = mongoose.model("Counter", counterSchema);

function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function normalizeUser(user) {
  if (!user) {
    return user;
  }

  const data = user.toObject ? user.toObject() : user;

  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    age: data.age,
    created_at: data.created_at,
    updated_at: data.updated_at,
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
    } else if (payload.first_name.trim().length > 100) {
      errors.push("first_name must be 100 characters or fewer");
    } else {
      data.first_name = payload.first_name.trim();
    }
  }

  if (!partial || Object.hasOwn(payload, "last_name")) {
    if (typeof payload.last_name !== "string" || payload.last_name.trim() === "") {
      errors.push("last_name must be a non-empty string");
    } else if (payload.last_name.trim().length > 100) {
      errors.push("last_name must be 100 characters or fewer");
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

async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "users" },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true },
  );

  return counter.value;
}

async function connectDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  await User.init();
  await Counter.init();
}

app.get("/", (req, res) => {
  res.json({
    message: "Practice work 20 API is running",
    database: "MongoDB",
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

  try {
    const timestamp = getUnixTimestamp();
    const user = await User.create({
      id: await getNextUserId(),
      ...data,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return res.status(201).json(normalizeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ id: 1 });
    return res.json(users.map(normalizeUser));
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
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(normalizeUser(user));
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

  try {
    const user = await User.findOneAndUpdate(
      { id },
      {
        $set: {
          ...data,
          updated_at: getUnixTimestamp(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(normalizeUser(user));
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
    const user = await User.findOneAndDelete({ id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      message: "User deleted",
      user: normalizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  connectDatabase,
  mongoose,
  User,
  Counter,
  getNextUserId,
};
