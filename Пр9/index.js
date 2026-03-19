const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3000;

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Practice 9 Auth API",
      version: "1.0.0",
      description: "API for registration, login, refresh tokens, and products",
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

  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return res.status(409).json({ error: "user already exists" });
  }

  const newUser = {
    id: nanoid(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
  };

  users.push(newUser);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = users.find((candidate) => candidate.email === email);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
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

    const tokenPair = issueTokenPair(user);

    return res.json(tokenPair);
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
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Laptop
 *               price:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Product created
 */
app.post("/api/products", (req, res) => {
  const product = { id: nanoid(), ...req.body };
  products.push(product);
  return res.status(201).json(product);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: Product list
 */
app.get("/api/products", (req, res) => {
  return res.json(products);
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
  const product = products.find((candidate) => candidate.id === req.params.id);

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
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex((candidate) => candidate.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: "product not found" });
  }

  products[productIndex] = { ...products[productIndex], ...req.body };

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
  const productIndex = products.findIndex((candidate) => candidate.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: "product not found" });
  }

  products.splice(productIndex, 1);

  return res.json({ message: "product deleted" });
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
