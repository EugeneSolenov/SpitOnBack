const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3001; // Порт бэкенда

app.use(express.json());
app.use(cors());

// --- Настройка SWAGGER ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Интернет-магазина',
            version: '1.0.0',
            description: 'API для управления товарами (Практика 4 + 5)',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Сервер магазина',
            },
        ],
    },
    apis: ['./index.js'], // Читаем документацию из этого файла
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Перенаправление с главной на документацию
app.get('/', (req, res) => res.redirect('/api-docs'));

// --- БАЗА ДАННЫХ (Товары) ---
const PLACEHOLDER_IMG = "https://via.placeholder.com/300x200?text=No+Image";

let products = [
    { 
        id: nanoid(6), 
        name: 'iPhone 13', 
        category: 'Смартфоны', 
        description: 'Мощный телефон',
        price: 60000, 
        stock: 10,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-13-01.jpg' 
    },
    { 
        id: nanoid(6), 
        name: 'MacBook Air', 
        category: 'Ноутбуки', 
        description: 'Легкий ноутбук',
        price: 90000, 
        stock: 5,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-macbook-air-m2-2022-1.jpg' 
    }
];

// --- SWAGGER СХЕМЫ ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена в рублях
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         image:
 *           type: string
 *           description: Ссылка на изображение
 *       example:
 *         id: "abc123"
 *         name: "iPhone 15"
 *         category: "Смартфоны"
 *         description: "Новый флагман"
 *         price: 100000
 *         stock: 20
 *         image: "https://example.com/iphone.jpg"
 */

// --- МАРШРУТЫ API ---

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар создан
 *       400:
 *         description: Ошибка валидации
 */
app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, image } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: "Название и цена обязательны" });
    }

    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category || 'Разное',
        description: description || '',
        price: Number(price),
        stock: Number(stock) || 0,
        image: image || PLACEHOLDER_IMG
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });

    const { name, category, description, price, stock, image } = req.body;

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (image) product.image = image;

    res.json(product);
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
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар удален
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.json({ message: "Удалено" });
});

app.listen(port, () => {
    console.log(`Сервер: http://localhost:${port}`);
    console.log(`Документация: http://localhost:${port}/api-docs`);
});