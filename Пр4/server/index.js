const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Дефолтная картинка-заглушка (если фото нет)
const PLACEHOLDER_IMG = "https://via.placeholder.com/300x200?text=No+Image";

let products = [
    { 
        id: nanoid(6), 
        name: 'iPhone 13', 
        category: 'Смартфоны', 
        price: 60000, 
        stock: 10,
        image: 'https://img.freepik.com/free-photo/close-up-woman-hands-holding-smartphone-with-black-screen_158595-6847.jpg' 
    },
    { 
        id: nanoid(6), 
        name: 'MacBook Air', 
        category: 'Ноутбуки', 
        price: 90000, 
        stock: 5,
        image: 'https://img.freepik.com/free-photo/laptop-airport-lounge_53876-143023.jpg' 
    },
    { 
        id: nanoid(6), 
        name: 'Sony Headphones', 
        category: 'Наушники', 
        price: 25000, 
        stock: 20,
        image: 'https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF1000,1000_QL80_.jpg' 
    },
];

// GET
app.get('/api/products', (req, res) => {
    res.json(products);
});

// POST
app.post('/api/products', (req, res) => {
    const { name, category, price, stock, image } = req.body;
    
    const newProduct = {
        id: nanoid(6),
        name: name ? name.trim() : 'Без названия',
        category: category || 'Разное',
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        image: image || PLACEHOLDER_IMG // Сохраняем картинку или заглушку
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// PATCH
app.patch('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });

    const { name, category, price, stock, image } = req.body;

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (image) product.image = image; // Обновляем картинку

    res.json(product);
});

// DELETE
app.delete('/api/products/:id', (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.json({ message: "Удалено" });
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});