const express = require('express');

const fields = ['brand', 'model', 'year', 'price'];
const sortFields = ['id', ...fields];

// Каждое приложение получает независимое хранилище в памяти.
function createApp() {
  const app = express();
  app.set('query parser', 'simple');
  let cars = [
    { id: 1, brand: 'Toyota', model: 'Camry', year: 2020, price: 2400000 },
    { id: 2, brand: 'BMW', model: 'X3', year: 2022, price: 4500000 },
    { id: 3, brand: 'Toyota', model: 'Corolla', year: 2018, price: 1600000 },
    { id: 4, brand: 'Lada', model: 'Vesta', year: 2023, price: 1400000 },
    { id: 5, brand: 'Kia', model: 'Rio', year: 2021, price: 1800000 }
  ];
  let nextId = 6;
  app.use(express.json());

  function validateCar(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return ['Тело запроса должно быть JSON-объектом'];
    }
    const errors = [];
    for (const field of fields) {
      if (!Object.hasOwn(body, field)) errors.push(`Поле ${field} обязательно`);
    }
    for (const field of ['brand', 'model']) {
      if (Object.hasOwn(body, field) &&
          (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > 100)) {
        errors.push(`${field}: непустая строка длиной до 100 символов`);
      }
    }
    const maxYear = new Date().getFullYear() + 1;
    if (Object.hasOwn(body, 'year') &&
        (!Number.isInteger(body.year) || body.year < 1886 || body.year > maxYear)) {
      errors.push(`year: целое число от 1886 до ${maxYear}`);
    }
    if (Object.hasOwn(body, 'price') &&
        (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
      errors.push('price: конечное неотрицательное число');
    }
    for (const field of Object.keys(body)) {
      if (!fields.includes(field)) errors.push(`Неизвестное поле: ${field}`);
    }
    return errors;
  }

  function carData(body) {
    return { brand: body.brand.trim(), model: body.model.trim(), year: body.year, price: body.price };
  }

  function resource(req, res, next) {
    const rawId = req.params.id;
    const id = Number(rawId);
    if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id)) {
      return res.status(400).json({ error: 'id должен быть положительным целым числом' });
    }
    const index = cars.findIndex(car => car.id === id);
    if (index === -1) return res.status(404).json({ error: 'Автомобиль не найден' });
    req.carIndex = index;
    next();
  }

  // Поиск -> сортировка -> пагинация; исходный массив не сортируется.
  app.get('/cars', (req, res) => {
    const query = req.query;
    for (const key of Object.keys(query)) {
      if (!['search', 'sort', 'order', 'page', 'limit'].includes(key)) {
        return res.status(400).json({ error: `Неизвестный query-параметр: ${key}` });
      }
      if (typeof query[key] !== 'string') {
        return res.status(400).json({ error: `Параметр ${key} должен быть передан один раз` });
      }
    }
    const sort = query.sort ?? 'id';
    const order = query.order ?? 'asc';
    if (!sortFields.includes(sort)) return res.status(400).json({ error: 'Недопустимое поле сортировки' });
    if (!['asc', 'desc'].includes(order)) return res.status(400).json({ error: 'order: asc или desc' });
    const pageRaw = query.page ?? '1';
    const limitRaw = query.limit ?? '10';
    const page = Number(pageRaw);
    const limit = Number(limitRaw);
    if (!/^[1-9]\d*$/.test(pageRaw) || !Number.isSafeInteger(page)) {
      return res.status(400).json({ error: 'page должен быть положительным целым числом' });
    }
    if (!/^[1-9]\d*$/.test(limitRaw) || !Number.isSafeInteger(limit) || limit > 100) {
      return res.status(400).json({ error: 'limit должен быть целым числом от 1 до 100' });
    }
    const search = (query.search ?? '').trim().toLowerCase();
    const result = cars.filter(car => car.brand.toLowerCase().includes(search));
    result.sort((a, b) => {
      const comparison = typeof a[sort] === 'string'
        ? a[sort].localeCompare(b[sort], 'ru', { sensitivity: 'base' })
        : a[sort] - b[sort];
      return (order === 'asc' ? comparison : -comparison) || a.id - b.id;
    });
    const total = result.length;
    const offset = (page - 1) * limit;
    const items = result.slice(offset, offset + limit);
    res.json({ total, count: items.length, page, limit, pages: Math.ceil(total / limit), items });
  });

  app.get('/cars/:id', resource, (req, res) => res.json(cars[req.carIndex]));

  app.post('/cars', (req, res) => {
    const errors = validateCar(req.body);
    if (errors.length) return res.status(400).json({ error: 'Ошибка валидации', details: errors });
    const car = { id: nextId++, ...carData(req.body) };
    cars.push(car);
    res.location(`/cars/${car.id}`).status(201).json(car);
  });

  // PUT заменяет все изменяемые поля; id остаётся прежним.
  app.put('/cars/:id', resource, (req, res) => {
    const errors = validateCar(req.body);
    if (errors.length) return res.status(400).json({ error: 'Ошибка валидации', details: errors });
    const car = { id: cars[req.carIndex].id, ...carData(req.body) };
    cars[req.carIndex] = car;
    res.json(car);
  });

  app.delete('/cars/:id', resource, (req, res) => {
    cars.splice(req.carIndex, 1);
    res.status(204).end();
  });

  // express.json() сообщает синтаксическую ошибку до вызова маршрута.
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Некорректный JSON' });
    }
    next(error);
  });
  app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Cars API: http://127.0.0.1:${port}/cars`));
}
module.exports = { createApp };
