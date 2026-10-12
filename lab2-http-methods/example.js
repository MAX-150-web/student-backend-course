// Практический пример методички: товары в памяти, пять CRUD-маршрутов.
const express = require('express');

function createExampleApp() {
  const app = express();
  app.use(express.json());
  let items = [
    { id: 1, name: 'Товар 1', price: 100, quantity: 5 },
    { id: 2, name: 'Товар 2', price: 200, quantity: 3 },
    { id: 3, name: 'Товар 3', price: 300, quantity: 10 }
  ];
  let nextId = 4;
  app.get('/items', (req, res) => res.json({ count: items.length, items }));
  app.get('/items/:id', (req, res) => {
    const item = items.find(item => item.id === Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Элемент не найден' });
    res.json(item);
  });
  app.post('/items', (req, res) => {
    const { name, price, quantity } = req.body || {};
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Поля name и price обязательны' });
    }
    const item = { id: nextId++, name, price, quantity: quantity || 0 };
    items.push(item);
    res.status(201).json(item);
  });
  app.put('/items/:id', (req, res) => {
    const index = items.findIndex(item => item.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Элемент не найден' });
    const { name, price, quantity } = req.body || {};
    items[index] = {
      id: items[index].id,
      name: name || items[index].name,
      price: price !== undefined ? price : items[index].price,
      quantity: quantity !== undefined ? quantity : items[index].quantity
    };
    res.json(items[index]);
  });
  app.delete('/items/:id', (req, res) => {
    const index = items.findIndex(item => item.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Элемент не найден' });
    const deleted = items.splice(index, 1)[0];
    res.json({ message: 'Элемент удалён', deleted });
  });
  app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
  return app;
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  createExampleApp().listen(port, '127.0.0.1', () => console.log(`Example API: http://127.0.0.1:${port}/items`));
}
module.exports = { createExampleApp };
