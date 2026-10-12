const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');

async function withApi(work) {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body) {
    const response = await fetch(base + path, { method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, json: text ? JSON.parse(text) : null };
  }
  try { await work(request, base); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const valid = { brand: 'Honda', model: 'Civic', year: 2024, price: 2600000 };

test('CRUD: 201, Location, полная замена PUT, 204 без тела, 404, уникальность ID', () => withApi(async request => {
  assert.equal((await request('/cars')).json.total, 5);
  assert.equal((await request('/cars/2')).json.brand, 'BMW');
  const created = await request('/cars', 'POST', valid);
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('location'), '/cars/6');
  assert.deepEqual((await request('/cars/6')).json, { id: 6, ...valid });
  const replacement = { ...valid, model: 'Accord', price: 0 };
  const updated = await request('/cars/6', 'PUT', replacement);
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.json, { id: 6, ...replacement });
  assert.deepEqual((await request('/cars/6', 'PUT', replacement)).json, updated.json);
  assert.equal((await request('/cars/6', 'PUT', { price: 1 })).status, 400);
  assert.deepEqual((await request('/cars/6')).json, updated.json);
  const deleted = await request('/cars/6', 'DELETE');
  assert.equal(deleted.status, 204);
  assert.equal(deleted.text, '');
  assert.equal((await request('/cars/6')).status, 404);
  assert.equal((await request('/cars/6', 'DELETE')).status, 404);
  assert.equal((await request('/cars', 'POST', valid)).json.id, 7);
}));

test('Поиск по brand без учёта регистра; пустой результат', () => withApi(async request => {
  assert.deepEqual((await request('/cars?search=tOyOtA')).json.items.map(car => car.id), [1, 3]);
  assert.equal((await request('/cars?search=Camry')).json.total, 0);
  const result = (await request('/cars?search=absent')).json;
  assert.deepEqual(result.items, []);
  assert.equal(result.pages, 0);
}));

test('Числовая и строковая сортировка; GET не изменяет хранилище', () => withApi(async request => {
  assert.deepEqual((await request('/cars?sort=price&order=asc')).json.items.map(car => car.id), [4, 3, 5, 1, 2]);
  assert.deepEqual((await request('/cars?sort=year&order=desc')).json.items.map(car => car.id), [4, 2, 5, 1, 3]);
  assert.deepEqual((await request('/cars?sort=brand')).json.items.map(car => car.brand), ['BMW', 'Kia', 'Lada', 'Toyota', 'Toyota']);
  assert.deepEqual((await request('/cars')).json.items.map(car => car.id), [1, 2, 3, 4, 5]);
}));

test('Пагинация и последовательность поиска, сортировки, среза', () => withApi(async request => {
  const page = (await request('/cars?page=2&limit=2')).json;
  assert.deepEqual(page.items.map(car => car.id), [3, 4]);
  assert.equal(page.total, 5);assert.equal(page.count, 2);assert.equal(page.pages, 3);
  assert.deepEqual((await request('/cars?page=9&limit=2')).json.items, []);
  const combined = (await request('/cars?search=toyota&sort=price&order=desc&page=1&limit=1')).json;
  assert.equal(combined.total, 2);assert.equal(combined.items[0].id, 1);
}));

test('Обязательные поля и типы: POST и PUT отклоняют данные без изменения коллекции', () => withApi(async request => {
  const invalid = [{}, { brand: 'Honda' }, null, [], { ...valid, brand: 10 }, { ...valid, model: false },
    { ...valid, year: '2024' }, { ...valid, year: 2024.5 }, { ...valid, price: '2600000' }, { ...valid, price: null }];
  for (const body of invalid) {
    for (const [path, method] of [['/cars', 'POST'], ['/cars/1', 'PUT']]) {
      assert.equal((await request(path, method, body)).status, 400, `${method} ${JSON.stringify(body)}`);
    }
  }
  assert.equal((await request('/cars')).json.total, 5);
  assert.equal((await request('/cars/1')).json.model, 'Camry');
}));

test('Допустимые значения и границы года, цены, строк', () => withApi(async request => {
  for (const body of [{ ...valid, brand: ' ' }, { ...valid, model: '' }, { ...valid, brand: 'x'.repeat(101) },
    { ...valid, year: 1885 }, { ...valid, year: new Date().getFullYear() + 2 }, { ...valid, price: -1 },
    { ...valid, id: 20 }]) assert.equal((await request('/cars', 'POST', body)).status, 400);
  const minimum = await request('/cars', 'POST', { ...valid, brand: ' Honda ', year: 1886, price: 0 });
  assert.equal(minimum.status, 201);assert.equal(minimum.json.brand, 'Honda');
  assert.equal((await request('/cars', 'POST', { ...valid, year: new Date().getFullYear() + 1 })).status, 201);
}));

test('Неверные query-параметры возвращают 400', () => withApi(async request => {
  for (const query of ['sort=unknown', 'order=up', 'page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=9007199254740992',
    'limit=0', 'limit=101', 'limit=abc', 'search=a&search=b', 'sort=id&sort=price', 'other=x']) {
    assert.equal((await request(`/cars?${query}`)).status, 400, query);
  }
}));

test('Неверные ID и отсутствующие ресурсы/маршруты', () => withApi(async request => {
  for (const id of ['abc', '1x', '0', '-1', '1.5', '9007199254740992']) {
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request(`/cars/${id}`, method, method === 'PUT' ? valid : undefined)).status, 400);
  }
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request('/cars/999', method, method === 'PUT' ? valid : undefined)).status, 404);
  assert.equal((await request('/unknown')).status, 404);
}));

test('Синтаксическая ошибка JSON — 400; отсутствующее тело — 400', () => withApi(async (request, base) => {
  const response = await fetch(base + '/cars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(response.status, 400);assert.equal((await response.json()).error, 'Некорректный JSON');
  assert.equal((await request('/cars', 'POST')).status, 400);
}));

test('Новое приложение восстанавливает начальные данные: память не сохраняется', async () => {
  await withApi(async request => { await request('/cars/1', 'DELETE');assert.equal((await request('/cars')).json.total, 4); });
  await withApi(async request => { assert.equal((await request('/cars')).json.total, 5);assert.equal((await request('/cars/1')).status, 200); });
});
