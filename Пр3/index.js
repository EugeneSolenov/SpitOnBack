const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// База данных в памяти
let products = [
    { id: 1, name: 'Ноутбук', price: 50000 },
    { id: 2, name: 'Смартфон', price: 30000 },
    { id: 3, name: 'Наушники', price: 5000 }
];

// 1. Получить все товары
app.get('/products', (req, res) => {
    res.json(products);
});

// 2. Получить товар по ID
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id === +req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ message: 'Товар не найден' });
});

// 3. Добавить товар
app.post('/products', (req, res) => {
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        price: req.body.price
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// 4. Обновить товар
app.put('/products/:id', (req, res) => {
    const product = products.find(p => p.id === +req.params.id);
    if (product) {
        product.name = req.body.name;
        product.price = req.body.price;
        res.json(product);
    } else {
        res.status(404).json({ message: 'Товар не найден' });
    }
});

// 5. Удалить товар
app.delete('/products/:id', (req, res) => {
    products = products.filter(p => p.id !== +req.params.id);
    res.json({ message: 'Товар удален' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});