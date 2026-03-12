const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3000;

const JWT_SECRET = "access_secret";
const ACCESS_EXPIRES_IN = "15m";

app.use(express.json());

// Настройка Swagger с поддержкой Bearer Auth
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'API AUTH & PRODUCTS', version: '1.0.0' },
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./index.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let users = [];
let products = [];

// Middleware для защиты маршрутов
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// === AUTH ===

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "test@mail.ru" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Ошибка валидации
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email и пароль обязательны" });

    const existingUser = users.find(u => u.email === email);
    if (existingUser) return res.status(400).json({ error: "Пользователь уже существует" });

    const newUser = {
        id: nanoid(),
        email,
        passwordHash: await bcrypt.hash(password, 10)
    };
    users.push(newUser);

    res.status(201).json({ id: newUser.id, email: newUser.email });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "test@mail.ru" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       200:
 *         description: Успешный вход (возвращает токен)
 *       401:
 *         description: Неверные учетные данные
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "Неверные учетные данные" });
    }

    const accessToken = jwt.sign(
        { sub: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );

    res.status(200).json({ accessToken });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Данные текущего пользователя
 *       401:
 *         description: Нет доступа
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    
    res.status(200).json({ id: user.id, email: user.email });
});


// === PRODUCTS ===

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Ноутбук" }
 *               price: { type: number, example: 50000 }
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', (req, res) => {
    const product = { id: nanoid(), ...req.body };
    products.push(product);
    res.status(201).json(product);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', (req, res) => {
    res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Не найдено
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Не найдено" });
    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
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
 *               title: { type: string, example: "Новый заголовок" }
 *               price: { type: number, example: 60000 }
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       404:
 *         description: Не найдено
 */
app.put('/api/products/:id', authMiddleware, (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Не найдено" });
    
    products[index] = { ...products[index], ...req.body };
    res.status(200).json(products[index]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар удален
 *       404:
 *         description: Не найдено
 */
app.delete('/api/products/:id', authMiddleware, (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Не найдено" });
    
    products.splice(index, 1);
    res.status(200).json({ message: "Удалено" });
});

app.listen(PORT, () => {
    console.log(`Сервер: http://localhost:${PORT}`);
    console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});