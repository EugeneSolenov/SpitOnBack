const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const port = 3001; // Запускаем бэкенд на порту 3001

app.use(express.json());

// Настройка CORS (разрешаем запросы с фронтенда)
app.use(cors());

// Начальный список товаров (минимум 10 штук)
let products = [
    { id: nanoid(6), name: 'iPhone 13', category: 'Смартфоны', description: 'Мощный и стильный', price: 60000, stock: 10 },
    { id: nanoid(6), name: 'Samsung S21', category: 'Смартфоны', description: 'Отличная камера', price: 55000, stock: 15 },
    { id: nanoid(6), name: 'MacBook Air', category: 'Ноутбуки', description: 'Легкий и быстрый', price: 90000, stock: 5 },
    { id: nanoid(6), name: 'Asus ROG', category: 'Ноутбуки', description: 'Для игр', price: 120000, stock: 3 },
    { id: nanoid(6), name: 'Sony WH-1000XM4', category: 'Наушники', description: 'Лучший шумодав', price: 25000, stock: 20 },
    { id: nanoid(6), name: 'AirPods Pro', category: 'Наушники', description: 'Компактные и удобные', price: 20000, stock: 25 },
    { id: nanoid(6), name: 'iPad Air', category: 'Планшеты', description: 'Идеален для учебы', price: 45000, stock: 8 },
    { id: nanoid(6), name: 'Xiaomi Pad 5', category: 'Планшеты', description: 'Топ за свои деньги', price: 30000, stock: 12 },
    { id: nanoid(6), name: 'Apple Watch 7', category: 'Часы', description: 'Следите за здоровьем', price: 35000, stock: 10 },
    { id: nanoid(6), name: 'Mi Band 6', category: 'Часы', description: 'Простой трекер', price: 3000, stock: 50 },
];

// GET: Получить все товары
app.get('/api/products', (req, res) => {
    res.json(products);
});

// POST: Создать товар
app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock } = req.body;
    
    // Простая валидация
    if (!name || !price) {
        return res.status(400).json({ error: "Название и цена обязательны" });
    }

    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category || 'Разное',
        description: description || '',
        price: Number(price),
        stock: Number(stock) || 0
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// PATCH: Обновить товар
app.patch('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = products.find(p => p.id === id);

    if (!product) return res.status(404).json({ error: "Товар не найден" });

    const { name, category, description, price, stock } = req.body;

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);

    res.json(product);
});

// DELETE: Удалить товар
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    products = products.filter(p => p.id !== id);
    res.json({ message: "Удалено" });
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});