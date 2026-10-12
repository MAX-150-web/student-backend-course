# Лабораторная работа №2

## HTTP-методы: обработка GET, POST, PUT, DELETE

**Студент:** Коровин Максим Александрович<br>
**Группа:** ПИЖж-б-о-25-1<br>
**Вариант:** 10<br>
**Уровень:** средний (комплект 2)<br>
**Сущность:** автомобили (`cars`)<br>
**Технология:** Node.js + Express<br>
**Дата выполнения:** 12 октября 2026 г.

Группа перенесена из титульного листа существующего отчёта [ЛР №1](../LR_1/README.md).

## Содержание

- [Цель работы](#цель-работы)
- [Теоретическое обоснование](#теоретическое-обоснование)
- [Подготовка и запуск](#подготовка-и-запуск)
- [Выполнение практического примера](#выполнение-практического-примера)
- [Выполнение индивидуального задания](#выполнение-индивидуального-задания)
- [Проверки и вывод команд](#проверки-и-вывод-команд)
- [Контрольные вопросы](#контрольные-вопросы)
- [Вывод](#вывод)
- [Источники](#источники)

## Цель работы

Освоить обработку HTTP-методов GET, POST, PUT и DELETE в Express, реализовать CRUD-операции над коллекцией в памяти сервера, научиться валидировать входные данные, выполнять поиск, сортировку и пагинацию и возвращать корректные HTTP-коды ответа.

## Теоретическое обоснование

CRUD обозначает создание (Create), чтение (Read), обновление (Update) и удаление (Delete) данных. В API этим операциям соответствуют POST, GET, PUT и DELETE. GET предназначен для чтения и не изменяет состояние коллекции. PUT заменяет представление ресурса; PATCH используется для частичного изменения. Повторение одинакового PUT или DELETE приводит к тому же конечному состоянию, поэтому эти методы идемпотентны. При повторном DELETE код ответа может измениться с 204 на 404: идемпотентность относится к состоянию данных.

HTTP-код сообщает результат обработки запроса: 200 — успешное получение или обновление, 201 — создание ресурса, 204 — успешная операция без тела ответа, 400 — некорректные данные, 404 — ресурс или маршрут не найден. В Express JSON отправляется через `res.json()`, код задаётся через `res.status()`, а `express.json()` разбирает JSON-тело запроса в `req.body`. Параметры маршрута доступны в `req.params`, параметры строки запроса — в `req.query`.

В работе данные находятся в массиве в оперативной памяти. После перезапуска восстанавливается начальный набор, а внесённые изменения теряются. Поиск выбирает подходящие автомобили, сортировка упорядочивает результат, пагинация возвращает его часть. Порядок этих действий важен: сначала фильтрация, затем сортировка, затем срез страницы. Сортируется отдельный массив, поэтому GET не меняет порядок исходного хранилища.

## Подготовка и запуск

Проверки выполнены с Node.js `v24.19.0`, Express `5.2.1` и pnpm `11.25.0`. Express закреплён в `package.json`, дерево зависимостей сохранено в `pnpm-lock.yaml`.

Воспроизводимый запуск из корня репозитория:

```bash
cd lab2-http-methods
pnpm install --frozen-lockfile
pnpm start
```

Основной сервер: `http://127.0.0.1:3000/cars`.

В другом терминале для практического примера:

```bash
cd lab2-http-methods
pnpm example
```

Сервер примера: `http://127.0.0.1:3001/items`. Можно использовать npm: `npm install`, `npm start`, `npm run example`. Для точного восстановления дерева зависимостей предпочтительна команда pnpm выше.

Обычный запуск без менеджера пакетов после установки зависимостей:

```bash
node app.js
node example.js
```

Каждая команда запускается в своём терминале. Для автоматического перезапуска основного сервера предусмотрено `pnpm dev` (`node --watch app.js`). Список скриптов находится в [package.json](package.json).

```text
lab2-http-methods/
├── README.md
├── app.js                  # Средний уровень, вариант 10
├── example.js              # Практический пример методички
├── package.json
├── pnpm-lock.yaml
├── curl_commands.txt
├── tests/api.test.js
├── tools/                  # Воспроизводимые проверки и браузерный клиент
├── checks/                 # Настоящий вывод команд и тела запросов
└── screenshots/            # 26 настоящих снимков браузера
```

## Выполнение практического примера

Создан отдельный сервер товаров из методички. Он хранит три начальных объекта с полями `id`, `name`, `price`, `quantity` и реализует пять CRUD-маршрутов. Порт изменён с 3000 на 3001, чтобы одновременно проверять пример и индивидуальное задание. Данные и обработчики примера изолированы от коллекции автомобилей.

В примере методички PUT сохраняет пропущенные поля, а DELETE возвращает 200 и удалённый объект. В индивидуальном задании реализованы полная замена PUT и требуемый средним уровнем DELETE с кодом 204.

### Код сервера примера

Полный исходный файл: [example.js](example.js).

```javascript
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
```

### Проверки примера

Все запросы выполнены после свежего запуска сервера. Скриншоты получены из реально работающего браузерного HTTP-клиента; в каждом видны метод, адрес, тело запроса при его наличии, код, заголовки и тело ответа. Клиент описан в разделе проверок.

| Метод и адрес | Результат |
| --- | --- |
| `GET /items` | 200, три начальных товара |
| `GET /items/2` | 200, товар №2 |
| `POST /items` | 201, новый товар с id=4 |
| `PUT /items/1` | 200, изменённые name, price, quantity |
| `DELETE /items/3` | 200, сообщение и удалённый товар |

**GET: весь список.**

![Практический пример: GET списка](screenshots/example-list.jpg)

**GET: товар с id=2.**

![Практический пример: GET одного товара](screenshots/example-one.jpg)

**POST: создание товара.**

![Практический пример: POST 201](screenshots/example-create.jpg)

**PUT: обновление товара.**

![Практический пример: PUT 200](screenshots/example-update.jpg)

**DELETE: удаление товара.**

![Практический пример: DELETE 200](screenshots/example-delete.jpg)

## Выполнение индивидуального задания

### Условие варианта 10 среднего уровня

В таблицах методички (страницы 11–12) варианту 10 соответствует сущность «Автомобили»: основные поля `id`, `brand`, `model`, дополнительные поля `year`, `price`; поиск выполняется по `brand`. Средний уровень включает CRUD базового уровня, валидацию, поиск, сортировку, пагинацию и корректные HTTP-коды. Название коллекции `/items` из общих требований заменено предметным именем `/cars`.

### Маршруты и правила данных

| Метод и маршрут | Назначение | Успех | Ошибки |
| --- | --- | --- | --- |
| `GET /cars` | Список, поиск, сортировка, страницы | 200 | 400 |
| `GET /cars/:id` | Один автомобиль | 200 | 400, 404 |
| `POST /cars` | Создание | 201 | 400 |
| `PUT /cars/:id` | Полная замена всех изменяемых полей | 200 | 400, 404 |
| `DELETE /cars/:id` | Удаление | 204, без тела | 400, 404 |
| Любой отсутствующий маршрут | Обработка отсутствующего адреса | — | 404 |

`id` назначает сервер с помощью возрастающего счётчика `nextId`. Удалённые номера повторно не используются в рамках жизни процесса. Клиент не передаёт `id` в POST или PUT.

| Поле | Валидация |
| --- | --- |
| `brand` | Обязательная непустая строка до 100 символов |
| `model` | Обязательная непустая строка до 100 символов |
| `year` | Обязательное целое число от 1886 до текущего года + 1 |
| `price` | Обязательное конечное число ≥ 0; в примерах цена в рублях |

Границы значений выбраны для этой реализации: методичка требует проверять допустимые значения, но не задаёт конкретных диапазонов. При выполнении работы верхняя граница года равна 2027. Пробелы по краям марок и моделей удаляются, неизвестные поля отклоняются. Строка `"2600000"` не считается числом. Отсутствующие поля PUT не сохраняются из старого объекта: запрос возвращает 400, коллекция остаётся прежней.

| Query-параметр | Значения и поведение |
| --- | --- |
| `search` | Подстрока в `brand`, регистр не учитывается |
| `sort` | `id`, `brand`, `model`, `year`, `price`; по умолчанию `id` |
| `order` | `asc` или `desc`; по умолчанию `asc` |
| `page` | Положительное безопасное целое число; по умолчанию 1 |
| `limit` | Целое число 1–100; по умолчанию 10 |

Неизвестные или повторяющиеся query-параметры возвращают 400. Для чисел применяется числовое сравнение, для строк — `localeCompare`. При равных значениях используется id, чтобы результат страниц был устойчивым. Список возвращается как `{total, count, page, limit, pages, items}`: `total` — количество после поиска, `count` — количество на текущей странице. Страница за пределами результата и поиск без совпадений возвращают 200 с пустым `items`.

### Код сервера автомобилей

Полный исходный файл: [app.js](app.js).

```javascript
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
```

### Проверка CRUD

**GET `/cars`:** получены пять начальных автомобилей; `total=5`, `count=5`.

![GET списка автомобилей](screenshots/cars-list.jpg)

**GET `/cars/2`:** получен BMW X3.

![GET одного автомобиля](screenshots/cars-one.jpg)

**POST `/cars`:** создан Honda Civic, `id=6`, код 201; заголовок `Location` указывает `/cars/6`.

![POST автомобиля, 201 Created](screenshots/cars-create.jpg)

**GET `/cars/6` после создания:** подтверждено сохранение объекта в памяти.

![Чтение созданного автомобиля](screenshots/cars-created.jpg)

**PUT `/cars/6`:** все поля переданы заново; модель стала Accord, год — 2025, цена — 3100000, id не изменился.

![Полное обновление автомобиля](screenshots/cars-update.jpg)

**DELETE `/cars/6`:** получен 204 No Content, тело содержит 0 байт.

![Удаление автомобиля, 204 без тела](screenshots/cars-delete.jpg)

**GET `/cars/6` после удаления:** сервер вернул 404.

![Отсутствие автомобиля после удаления](screenshots/cars-after-delete.jpg)

**Повторный DELETE `/cars/6`:** возвращён 404; состояние коллекции не изменилось.

![Повторное удаление, 404](screenshots/cars-delete-repeat.jpg)

### Поиск, сортировка и пагинация

**Поиск:** `GET /cars?search=tOyOtA` возвращает только автомобили Toyota, несмотря на разный регистр запроса.

![Поиск по brand](screenshots/cars-search.jpg)

**Сортировка по цене по возрастанию:** `GET /cars?sort=price&order=asc`. Результат упорядочен численно.

![Сортировка по цене asc](screenshots/cars-sort-asc.jpg)

**Сортировка по убыванию:** `GET /cars?sort=price&order=desc`.

![Сортировка по цене desc](screenshots/cars-sort-desc.jpg)

**Пагинация:** `GET /cars?page=2&limit=2` возвращает id=3 и id=4. На момент проверки коллекция содержит шесть автомобилей, включая созданный id=6; `total=6`, `count=2`, `pages=3`.

![Вторая страница](screenshots/cars-page.jpg)

**Совместная проверка:** `GET /cars?search=toyota&sort=price&order=desc&page=1&limit=1` возвращает Toyota Camry; `total=2`, `count=1`, `pages=2`.

![Поиск, сортировка и пагинация вместе](screenshots/cars-combined.jpg)

### Валидация и ошибки

**Нет обязательных полей:** POST с одним `brand` возвращает 400 и перечень отсутствующих `model`, `year`, `price`.

![Обязательные поля, 400](screenshots/cars-missing.jpg)

**Неверный тип:** строковая цена возвращает 400.

![Неверный тип price, 400](screenshots/cars-type.jpg)

**Недопустимые значения:** пустая марка, год 1800 и отрицательная цена возвращают 400.

![Недопустимые значения, 400](screenshots/cars-values.jpg)

**Неполный PUT:** запрос только с `price` возвращает 400.

![Неполный PUT, 400](screenshots/cars-put-missing.jpg)

**Некорректная пагинация:** `page=0` возвращает 400.

![Неверный query-параметр, 400](screenshots/cars-query.jpg)

**Несуществующий автомобиль:** GET `/cars/999` возвращает 404.

![GET отсутствующего автомобиля, 404](screenshots/cars-not-found.jpg)

**Обновление отсутствующего автомобиля:** PUT `/cars/999` возвращает 404.

![PUT отсутствующего автомобиля, 404](screenshots/cars-put-not-found.jpg)

**Несуществующий маршрут:** GET `/unknown` возвращает 404.

![Несуществующий маршрут, 404](screenshots/cars-route.jpg)

## Проверки и вывод команд

### Как получены доказательства

26 запросов выполнены дважды: сначала настоящим `curl.exe`, затем через браузерный клиент. Серверы для браузера запущены заново, поэтому обе последовательности начинались с исходного набора данных. Клиент [tools/check-browser.js](tools/check-browser.js) отправляет выбранный запрос через локальный HTTP-прокси работающему серверу и отображает полученные код, заголовки и тело. В интерфейсе нет заранее записанных ответов. Вспомогательный клиент работает на порту 3100 и не добавляет эндпоинты в API автомобилей.

Все 26 файлов `.jpg` — непосредственные снимки вкладки браузера, без рисования, ретуши или вставки ответов. Время получения, метод, URL и размер ответа видны на снимках. Сведения о снимках сохранены в [checks/browser-evidence.json](checks/browser-evidence.json). Метки времени HTTP и клиента записаны в UTC; локальное время выполнения — 12.10.2026, примерно 21:43–21:45 (Москва).

### Повторение curl-проверок

Остановить отдельно запущенные серверы на 3000/3001 и выполнить:

```bash
node tools/check-curl.js
```

Скрипт сам запускает оба API, последовательно выполняет curl, проверяет коды и пустое тело 204, сохраняет вывод и останавливает серверы. Команды для ручного выполнения находятся в [curl_commands.txt](curl_commands.txt); их нужно выполнять по порядку после свежего запуска `app.js` и `example.js`. Тела JSON лежат в `checks/*-request.json`. Для Linux/macOS заменить `curl.exe` на `curl`.

Пример команды PowerShell без проблем с кавычками JSON:

```powershell
curl.exe --include --request POST "http://127.0.0.1:3000/cars" --header "Content-Type: application/json" --data-binary "@checks/cars-create-request.json"
```

Сохранённые материалы:

- [Полный вывод 26 запросов curl](checks/curl-output.txt) — команды, реальные заголовки, тела и результаты.
- [Сводка curl](checks/curl-summary.txt) — все 26 запросов завершились ожидаемыми кодами.
- [Ответы curl в JSON](checks/curl-responses.json) — те же ответы для машинного чтения.
- [Вывод запуска серверов](checks/server-output.txt).
- [Проверка версий и зависимостей](checks/setup-output.txt).
- [Вывод автоматических тестов](checks/test-output.txt).

Фрагмент реального вывода `curl` для удаления (полная запись по ссылке выше):

```http
HTTP/1.1 204 No Content
X-Powered-By: Express
Date: Mon, 12 Oct 2026 18:43:39 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

После заголовков отсутствует тело; это отдельно проверяется скриптом.

### Автоматические проверки

```bash
pnpm test
# или
node --test tests/api.test.js
```

Итог: **10 тестов, 10 успешных, 0 ошибок**. Проверены не только коды, но и содержимое данных: полный цикл CRUD, `Location`, идемпотентность PUT, уникальность id после удаления, отклонение неверных данных без изменения коллекции, поиск по марке, числовая/строковая сортировка, порядок применения фильтра и страницы, пустые результаты, границы значений, некорректные ID/query/JSON и восстановление начального набора в новом экземпляре приложения.

```text
# tests 10
# pass 10
# fail 0
```

При первом запуске проверок среда ограничивала локальные сетевые соединения (`EACCES`). После запуска с разрешённым доступом к loopback все тесты и curl-запросы прошли; изменения логики сервера для обхода ограничения не потребовались.

### Повторение браузерных проверок

Остановить другие процессы на портах 3000/3001/3100, затем выполнить:

```bash
pnpm checks:browser
```

Открыть `http://127.0.0.1:3100/`, выбирать проверки в порядке списка и нажимать «Отправить запрос». POST создаёт id=6, последующие GET/PUT/DELETE используют этот id. Для повторения всей последовательности перезапустить клиент: вместе с ним перезапускаются оба API и восстанавливаются начальные массивы. Остановка — Ctrl+C в терминале.

## Контрольные вопросы

Ответы на все 10 вопросов среднего уровня из методички.

### 1. В чём разница между PUT и PATCH?

PUT передаёт полное новое представление ресурса, PATCH — только изменения. В этой работе PUT требует `brand`, `model`, `year`, `price`; отсутствие одного из них приводит к 400. PATCH в задание среднего уровня не входит.

### 2. Как реализовать поиск по коллекции (query-параметр search)?

Прочитать `req.query.search`, привести запрос и значение поля к одному регистру и применить `filter()` с `includes()`. Здесь используется `car.brand.toLowerCase().includes(search)`, поэтому поиск идёт по марке, как требует вариант 10.

### 3. Как реализовать сортировку по полю?

Проверить поле по разрешённому списку, отсортировать копию результата через `sort()`. Числа сравниваются вычитанием, строки — через `localeCompare()`. Для `desc` знак сравнения меняется на противоположный; при равенстве применяется id.

### 4. Как реализовать пагинацию (постраничный вывод)?

Проверить положительные целые `page` и `limit`, вычислить начало страницы `(page - 1) * limit`, затем применить `slice(offset, offset + limit)`. Общее число страниц равно `Math.ceil(total / limit)`; `total` вычисляется после поиска, до среза.

### 5. Как валидировать входные данные (например, что price — число)?

Сначала проверить объект и наличие обязательных полей, затем типы и значения. Для цены используются `typeof price === 'number'`, `Number.isFinite(price)` и `price >= 0`. Проверки выполняются до изменения массива. Числовая строка автоматически не преобразуется.

### 6. Какие коды ответов используются при ошибках валидации?

В данной работе — 400 Bad Request с JSON-описанием ошибки. Он применяется к отсутствующим полям, неверным типам, диапазонам, параметрам URL и синтаксически некорректному JSON. Для отсутствующего ресурса используется 404.

### 7. Как вернуть 204 No Content при DELETE?

После удаления вызвать `res.status(204).end()`. Нельзя отправлять JSON-тело для ответа 204. Проверки подтвердили код 204 и нулевую длину тела.

### 8. В чём разница между res.json() и res.send()?

`res.json()` сериализует значение в JSON и устанавливает `Content-Type: application/json`. `res.send()` подходит для строк, буферов и других ответов; при передаче объекта Express также использует JSON. Для объектов API здесь явно вызывается `res.json()`.

### 9. Как избежать дублирования ID при создании новых элементов?

Использовать отдельный возрастающий счётчик `nextId`, а не `array.length + 1`: длина уменьшается после удаления. Счётчик увеличивается только после успешной валидации. В тесте после удаления id=6 новый объект получил id=7. После перезапуска данные и счётчик восстанавливаются совместно.

### 10. Что такое express.json() и почему без него req.body пустой?

Это middleware, который разбирает JSON-тело запросов с подходящим `Content-Type` и записывает объект в `req.body`. Express сам по себе не разбирает тело; без middleware или при неподходящем типе содержимого оно не будет представлено в `req.body` как JSON-объект. В запросах POST и PUT передаётся `Content-Type: application/json`.

## Вывод

Выполнен практический пример CRUD товаров и индивидуальное задание среднего уровня варианта 10: разработан API автомобилей с хранением в памяти, полным обновлением, поиском по марке, сортировкой, пагинацией и валидацией. Проверены все маршруты, ответы 200/201/204/400/404 и изменение коллекции после операций. Сохранены 26 настоящих скриншотов, полный вывод curl и результаты 10 автоматических тестов.

В ходе работы закреплено соответствие HTTP-методов операциям CRUD, различие полного и частичного обновления, правила пустого ответа 204 и порядок обработки параметров списка. Особого внимания потребовали строгое различение чисел и числовых строк, сохранение уникальности id после удаления и сортировка без изменения исходного массива. Ограничение локальных сетевых соединений в среде проверки было устранено разрешением доступа к loopback. Данные сохраняются только до перезапуска процесса, как предусмотрено заданием.

## Источники

1. «Лабораторная работа №2. HTTP-методы: обработка GET, POST, PUT, DELETE» — предоставленная методичка, 18 страниц; пример: стр. 4–10, средний уровень и вариант: стр. 11–12, вопросы: стр. 15, требования: стр. 16.
2. [Express 5.x — API Reference](https://expressjs.com/en/5x/api/).
3. [MDN — PUT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PUT).
4. [MDN — 204 No Content](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/204).
