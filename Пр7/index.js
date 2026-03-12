const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Middleware для парсинга JSON в теле запроса
app.use(express.json());

// НАСТРОЙКА SWAGGER
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API AUTH & PRODUCTS',
            version: '1.0.0',
            description: 'Практическая работа 7: Авторизация и товары',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./index.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// "БАЗА ДАННЫХ" (массивы в памяти)
let users = [];
let products = [];

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
async function hashPassword(password) {
    const rounds = 10;
    return await bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
}

// МАРШРУТЫ

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация (создание) пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "test@mail.ru" }
 *               first_name: { type: string, example: "Иван" }
 *               last_name: { type: string, example: "Иванов" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    // Проверка на наличие всех полей
    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: "Все поля обязательны для заполнения" });
    }

    // Проверка, существует ли уже пользователь с таким email
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Создание пользователя
    const newUser = {
        id: nanoid(),
        email: email,
        first_name: first_name,
        last_name: last_name,
        password: await hashPassword(password) 
    };

    users.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
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
 *         description: Успешная авторизация
 *       401:
 *         description: Неверные учетные данные
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: "Пользователь не найден или неверный пароль" });
    }

    const isAuthenticated = await verifyPassword(password, user.password);
    
    if (isAuthenticated) {
        res.status(200).json({ login: true, message: "Вы успешно вошли в систему!" });
    } else {
        res.status(401).json({ login: false, error: "Пользователь не найден или неверный пароль" });
    }
});


// CRUD ДЛЯ ТОВАРОВ

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Ноутбук" }
 *               category: { type: string, example: "Электроника" }
 *               description: { type: string, example: "Мощный игровой ноутбук" }
 *               price: { type: number, example: 50000 }
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', (req, res) => {
    const { title, category, description, price } = req.body;

    if (!title || !category || !description || price === undefined) {
        return res.status(400).json({ error: "Все поля товара обязательны" });
    }

    const newProduct = {
        id: nanoid(),
        title,
        category,
        description,
        price: Number(price)
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров
 *     tags: [Products]
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
 *     summary: Получить товар по id
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
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить параметры товара
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
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *     responses:
 *       200:
 *         description: Товар обновлен
 */
app.put('/api/products/:id', (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Товар не найден" });

    products[index] = { ...products[index], ...req.body };
    res.status(200).json(products[index]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
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
 */
app.delete('/api/products/:id', (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Товар не найден" });

    products.splice(index, 1);
    res.status(200).json({ message: "Товар успешно удален" });
});


app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);
});