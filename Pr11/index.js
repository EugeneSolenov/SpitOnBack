const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3000;
const FRONTEND_ORIGIN = "http://localhost:5173";

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const ROLES = {
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
};

const ROLE_VALUES = Object.values(ROLES);

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
  })
);
app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Practice 11 RBAC API",
      version: "1.1.0",
      description: "Backend for React client with JWT auth, refresh tokens and role-based access control",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const users = [];
const products = [];
const refreshTokens = new Set();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isBlocked: Boolean(user.isBlocked),
  };
}

function createStockProducts(createdBy) {
  return [
    {
      id: nanoid(),
      title: "Ноутбук Acer Aspire 5",
      category: "Ноутбуки",
      description: "Универсальный ноутбук для учебы, браузера и офисных задач.",
      imageUrl:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80",
      price: 54990,
      createdBy,
    },
    {
      id: nanoid(),
      title: "Смартфон Samsung Galaxy A55",
      category: "Смартфоны",
      description: "Смартфон среднего класса с хорошей камерой и ярким экраном.",
      imageUrl:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
      price: 39990,
      createdBy,
    },
    {
      id: nanoid(),
      title: "Наушники Sony WH-CH720N",
      category: "Аудио",
      description: "Беспроводные наушники с шумоподавлением для музыки и звонков.",
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
      price: 12990,
      createdBy,
    },
    {
      id: nanoid(),
      title: "Игровая мышь Logitech G102",
      category: "Периферия",
      description: "Легкая проводная мышь с точным сенсором и RGB-подсветкой.",
      imageUrl:
        "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=400&q=80",
      price: 2490,
      createdBy,
    },
    {
      id: nanoid(),
      title: "Монитор LG UltraWide 29",
      category: "Мониторы",
      description: "Широкоформатный монитор для многозадачности, учебы и фильмов.",
      imageUrl:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
      price: 21990,
      createdBy,
    },
  ];
}

function validateProductInput(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const price = Number(body.price);

  if (!title) {
    return { error: "title is required" };
  }

  if (!category) {
    return { error: "category is required" };
  }

  if (!description) {
    return { error: "description is required" };
  }

  if (!imageUrl) {
    return { error: "imageUrl is required" };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "price must be a non-negative number" };
  }

  return {
    value: {
      title,
      category,
      description,
      imageUrl,
      price,
    },
  };
}

function validateUserUpdateInput(body, currentUser) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    const normalizedEmail = normalizeEmail(body.email);

    if (!normalizedEmail) {
      return { error: "email cannot be empty" };
    }

    payload.email = normalizedEmail;
  }

  if (Object.prototype.hasOwnProperty.call(body, "role")) {
    if (!ROLE_VALUES.includes(body.role)) {
      return { error: "role must be one of: user, seller, admin" };
    }

    payload.role = body.role;
  }

  if (Object.prototype.hasOwnProperty.call(body, "password")) {
    if (typeof body.password !== "string" || body.password.trim().length < 6) {
      return { error: "password must contain at least 6 characters" };
    }

    payload.password = body.password.trim();
  }

  if (Object.keys(payload).length === 0) {
    return { error: "provide at least one field: email, role or password" };
  }

  if (payload.email && users.some((user) => user.email === payload.email && user.id !== currentUser.id)) {
    return { error: "user with this email already exists" };
  }

  return { value: payload };
}

function getActiveAdminCount(excludedUserId) {
  return users.filter(
    (user) => user.role === ROLES.ADMIN && !user.isBlocked && user.id !== excludedUserId
  ).length;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: nanoid(),
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    }
  );
}

function issueTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.add(refreshToken);

  return { accessToken, refreshToken };
}

function extractBearerToken(headerValue = "") {
  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function getRefreshTokenFromRequest(req) {
  return (
    req.body?.refreshToken ||
    req.headers["x-refresh-token"] ||
    extractBearerToken(req.headers.authorization)
  );
}

function revokeRefreshTokensForUser(userId) {
  for (const token of Array.from(refreshTokens)) {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET);

      if (payload.sub === userId) {
        refreshTokens.delete(token);
      }
    } catch (error) {
      refreshTokens.delete(token);
    }
  }
}

function authMiddleware(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = users.find((candidate) => candidate.id === payload.sub);

    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "user is blocked" });
    }

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }

    return next();
  };
}

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Users
 *   - name: Products
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new site user
 *     tags: [Auth]
 *     security: []
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = normalizeEmail(email);

  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "user already exists" });
  }

  if (String(password).trim().length < 6) {
    return res.status(400).json({ error: "password must contain at least 6 characters" });
  }

  const newUser = {
    id: nanoid(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role: ROLES.USER,
    isBlocked: false,
  };

  users.push(newUser);

  return res.status(201).json(sanitizeUser(newUser));
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get access + refresh tokens
 *     tags: [Auth]
 *     security: []
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = users.find((candidate) => candidate.email === normalizedEmail);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: "user is blocked" });
  }

  return res.json(issueTokenPair(user));
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate refresh token and issue a new token pair
 *     tags: [Auth]
 *     security: []
 */
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return res.status(400).json({ error: "refresh token is required" });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((candidate) => candidate.id === payload.sub);

    if (!user) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "user not found" });
    }

    if (user.isBlocked) {
      refreshTokens.delete(refreshToken);
      return res.status(403).json({ error: "user is blocked" });
    }

    refreshTokens.delete(refreshToken);
    return res.json(issueTokenPair(user));
  } catch (error) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((candidate) => candidate.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  return res.json(sanitizeUser(user));
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.get("/api/users", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  return res.json(users.map(sanitizeUser));
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.get("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = users.find((candidate) => candidate.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  return res.json(sanitizeUser(user));
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user email, role or password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.put("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  const user = users.find((candidate) => candidate.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  const validation = validateUserUpdateInput(req.body, user);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { email, role, password } = validation.value;

  if (
    user.role === ROLES.ADMIN &&
    role &&
    role !== ROLES.ADMIN &&
    getActiveAdminCount(user.id) === 0
  ) {
    return res.status(400).json({ error: "cannot remove the last active admin" });
  }

  if (email) {
    user.email = email;
  }

  if (role) {
    user.role = role;
    revokeRefreshTokensForUser(user.id);
  }

  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
    revokeRefreshTokensForUser(user.id);
  }

  return res.json(sanitizeUser(user));
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Block user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.delete("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const user = users.find((candidate) => candidate.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  if (user.role === ROLES.ADMIN && getActiveAdminCount(user.id) === 0) {
    return res.status(400).json({ error: "cannot block the last active admin" });
  }

  user.isBlocked = true;
  revokeRefreshTokensForUser(user.id);

  return res.json({
    message: "user blocked",
    user: sanitizeUser(user),
  });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware([ROLES.SELLER, ROLES.ADMIN]),
  (req, res) => {
    const validation = validateProductInput(req.body);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const product = {
      id: nanoid(),
      ...validation.value,
      createdBy: req.user.sub,
    };

    products.push(product);
    return res.status(201).json(product);
  }
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.get(
  "/api/products",
  authMiddleware,
  roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]),
  (req, res) => {
    return res.json(products);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.get(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]),
  (req, res) => {
    const product = products.find((candidate) => candidate.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: "product not found" });
    }

    return res.json(product);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.SELLER, ROLES.ADMIN]),
  (req, res) => {
    const productIndex = products.findIndex((candidate) => candidate.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "product not found" });
    }

    const validation = validateProductInput(req.body);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    products[productIndex] = {
      ...products[productIndex],
      ...validation.value,
    };

    return res.json(products[productIndex]);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const productIndex = products.findIndex((candidate) => candidate.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "product not found" });
    }

    const [deletedProduct] = products.splice(productIndex, 1);

    return res.json({
      message: "product deleted",
      product: deletedProduct,
    });
  }
);

async function seedData() {
  if (users.length > 0) {
    return;
  }

  const seedDefinitions = [
    {
      email: "admin@demo.local",
      password: "admin123",
      role: ROLES.ADMIN,
    },
    {
      email: "seller@demo.local",
      password: "seller123",
      role: ROLES.SELLER,
    },
    {
      email: "user@demo.local",
      password: "user1234",
      role: ROLES.USER,
    },
  ];

  const seededUsers = await Promise.all(
    seedDefinitions.map(async ({ email, password, role }) => ({
      id: nanoid(),
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      isBlocked: false,
    }))
  );

  users.push(...seededUsers);
  products.push(...createStockProducts(seededUsers[1].id));
}

async function startServer() {
  await seedData();

  app.listen(PORT, () => {
    console.log(`Backend started at http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
    console.log("Demo accounts:");
    console.log("  admin@demo.local / admin123");
    console.log("  seller@demo.local / seller123");
    console.log("  user@demo.local / user1234");
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
