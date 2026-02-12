const express = require('express');
const app = express();

app.use(express.json());

let products = [
    { id: 1, name: 'Телефон', price: 50000 },
    { id: 2, name: 'Ноутбук', price: 100000 }
];

app.get('/products', (req, res) => {
    res.json(products);
});

app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        res.json(product);
    } else {
        res.status(404).send();
    }
});

app.post('/products', (req, res) => {
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        price: req.body.price
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        product.name = req.body.name;
        product.price = req.body.price;
        res.json(product);
    } else {
        res.status(404).send();
    }
});

app.delete('/products/:id', (req, res) => {
    products = products.filter(p => p.id !== parseInt(req.params.id));
    res.status(204).send();
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});