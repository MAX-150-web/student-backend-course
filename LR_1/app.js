const express = require('express');

const app = express();

const port = 3000;

app.get('/', (req, res) => {
    res.send('API Gateway');
});

app.get('/api/students', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Иван',
            group: 'ПИЖ-101'
        },
        {
            id: 2,
            name: 'Анна',
            group: 'ПИЖ-102'
        },
        {
            id: 3,
            name: 'Максим',
            group: 'ПИЖ-101'
        }
    ]);
});

app.get('/api/groups', (req, res) => {
    res.json([
        'ПИЖ-101',
        'ПИЖ-102',
        'ПИЖ-103'
    ]);
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found'
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});