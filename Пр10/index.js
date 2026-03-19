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
      title: "Practice 10 Auth + Products API",
      version: "1.0.0",
      description: "Backend for React client with JWT auth and refresh tokens",
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

function createStockProducts(ownerId) {
  return [
    {
      id: nanoid(),
      title: "Ноутбук Acer Aspire 5",
      category: "Ноутбуки",
      description: "Универсальный ноутбук для учебы, браузера и офисных задач.",
      imageUrl:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80",
      price: 54990,
      ownerId,
    },
    {
      id: nanoid(),
      title: "Смартфон Samsung Galaxy A55",
      category: "Смартфоны",
      description: "Смартфон среднего класса с хорошей камерой и ярким экраном.",
      imageUrl:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
      price: 39990,
      ownerId,
    },
    {
      id: nanoid(),
      title: "Наушники Sony WH-CH720N",
      category: "Аудио",
      description: "Беспроводные наушники с шумоподавлением для музыки и звонков.",
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
      price: 12990,
      ownerId,
    },
    {
      id: nanoid(),
      title: "Игровая мышь Logitech G102",
      category: "Периферия",
      description: "Легкая проводная мышь с точным сенсором и RGB-подсветкой.",
      imageUrl:
        "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=400&q=80",
      price: 2490,
      ownerId,
    },
    {
      id: nanoid(),
      title: "Монитор LG UltraWide 29",
      category: "Мониторы",
      description: "Широкоформатный монитор для многозадачности, учебы и фильмов.",
      imageUrl:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
      price: 21990,
      ownerId,
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

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
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

function getRefreshTokenFromHeaders(req) {
  return req.headers["x-refresh-token"] || extractBearerToken(req.headers.authorization);
}

function authMiddleware(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Products
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@mail.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    return res.status(409).json({ error: "user already exists" });
  }

  const newUser = {
    id: nanoid(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
  };

  users.push(newUser);
  products.push(...createStockProducts(newUser.id));

  return res.status(201).json({
    id: newUser.id,
    email: newUser.email,
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get access + refresh tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@mail.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Token pair
 *       401:
 *         description: Invalid credentials
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((candidate) => candidate.email === normalizedEmail);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid credentials" });
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
 *     parameters:
 *       - in: header
 *         name: x-refresh-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Refresh token in a custom header
 *       - in: header
 *         name: Authorization
 *         required: false
 *         schema:
 *           type: string
 *         description: Bearer refresh token
 *     responses:
 *       200:
 *         description: New token pair
 *       401:
 *         description: Invalid or expired refresh token
 */
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = getRefreshTokenFromHeaders(req);

  if (!refreshToken) {
    return res.status(400).json({ error: "refresh token is required in headers" });
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
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((candidate) => candidate.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }

  return res.json({
    id: user.id,
    email: user.email,
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, description, imageUrl, price]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Laptop
 *               category:
 *                 type: string
 *                 example: Electronics
 *               description:
 *                 type: string
 *                 example: Lightweight laptop for study and work
 *               imageUrl:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1496181133206-80ce9b88a853
 *               price:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
app.post("/api/products", authMiddleware, (req, res) => {
  const validation = validateProductInput(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const product = {
    id: nanoid(),
    ...validation.value,
    ownerId: req.user.sub,
  };

  products.push(product);
  return res.status(201).json(product);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product list
 *       401:
 *         description: Unauthorized
 */
app.get("/api/products", authMiddleware, (req, res) => {
  const userProducts = products.filter((product) => product.ownerId === req.user.sub);
  return res.json(userProducts);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = products.find(
    (candidate) => candidate.id === req.params.id && candidate.ownerId === req.user.sub
  );

  if (!product) {
    return res.status(404).json({ error: "product not found" });
  }

  return res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, description, imageUrl, price]
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex(
    (candidate) => candidate.id === req.params.id && candidate.ownerId === req.user.sub
  );

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
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex(
    (candidate) => candidate.id === req.params.id && candidate.ownerId === req.user.sub
  );

  if (productIndex === -1) {
    return res.status(404).json({ error: "product not found" });
  }

  const [deletedProduct] = products.splice(productIndex, 1);

  return res.json({
    message: "product deleted",
    product: deletedProduct,
  });
});

app.listen(PORT, () => {
  console.log(`Backend started at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});