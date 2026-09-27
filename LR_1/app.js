const express = require('express');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Добро пожаловать на мой сервер!');
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Express'
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});