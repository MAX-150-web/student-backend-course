# Лабораторная работа №2: HTTP-методы: GET, POST, PUT, DELETE

**Студент:** Коровин Максим Александрович<br>
**Группа:** ПИЖ-б-о-25-1<br>
**Вариант:** 10<br>
**Уровень:** базовый<br>
**Технология:** Python + Flask<br>
**Дата:** 12 октября 2026 г.

## Цель работы

Научиться обрабатывать GET, POST, PUT и DELETE во Flask, реализовать CRUD для коллекции автомобилей в памяти и возвращать корректные коды ответа.

## Теоретическое обоснование

CRUD — четыре операции над данными: Create (создание), Read (чтение), Update (обновление), Delete (удаление). Им соответствуют HTTP-методы POST, GET, PUT и DELETE. GET получает данные, POST создаёт объект, PUT обновляет существующий объект, DELETE удаляет его. Метод и путь вместе определяют обработчик запроса.

Во Flask маршруты объявляются декораторами `@app.get`, `@app.post`, `@app.put`, `@app.delete`. JSON-тело запроса читается через `request.get_json()`, а ответ создаётся через `jsonify()`. Код 200 обозначает успех, 201 — создание, 404 — отсутствие ресурса. Данные хранятся в списке Python и теряются при перезапуске процесса.

## Подготовка и запуск

Из корня репозитория:

```powershell
cd LR_2
python -m pip install -r requirements.txt
python app.py
```

Индивидуальное задание работает по адресу `http://127.0.0.1:5002`.
В другом терминале из той же папки запустить практический пример:

```powershell
python example.py
```

Адрес примера: `http://127.0.0.1:5102`. Остановка сервера — Ctrl+C.
`debug=True` включает автоматический перезапуск после изменения файла.

В папке работы находятся [app.py](app.py), [example.py](example.py), [requirements.txt](requirements.txt),
этот отчёт, [curl_commands.txt](curl_commands.txt), [command_output.txt](command_output.txt),
папки `screenshots`, `requests` и `static`. Все материалы работы находятся вместе.

## Выполнение практического примера

Практический пример товаров из методички перенесён на Flask. Используются поля `id`, `name`, `price`, `quantity`, три начальных товара и пять CRUD-маршрутов. Отдельный порт позволяет запускать пример одновременно с индивидуальным заданием.

Исходный файл: [example.py](example.py).

```python
from flask import Flask, abort, jsonify, request

app = Flask(__name__)
app.json.ensure_ascii = False

items = [
    {"id": 1, "name": "Товар 1", "price": 100, "quantity": 5},
    {"id": 2, "name": "Товар 2", "price": 200, "quantity": 3},
    {"id": 3, "name": "Товар 3", "price": 300, "quantity": 10}
]
next_id = 4


def find_item(item_id):
    for item in items:
        if item["id"] == item_id:
            return item
    abort(404)


@app.get("/items")
def get_items():
    return jsonify(count=len(items), items=items)


@app.get("/items/<int:item_id>")
def get_item(item_id):
    return jsonify(find_item(item_id))


@app.post("/items")
def create_item():
    global next_id
    data = request.get_json()
    item = {"id": next_id, "name": data["name"], "price": data["price"],
            "quantity": data.get("quantity", 0)}
    items.append(item)
    next_id += 1
    return jsonify(item), 201


@app.put("/items/<int:item_id>")
def update_item(item_id):
    item = find_item(item_id)
    data = request.get_json()
    item["name"] = data.get("name", item["name"])
    item["price"] = data.get("price", item["price"])
    item["quantity"] = data.get("quantity", item["quantity"])
    return jsonify(item)


@app.delete("/items/<int:item_id>")
def delete_item(item_id):
    item = find_item(item_id)
    items.remove(item)
    return jsonify(message="Элемент удалён", deleted=item)


@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Элемент или маршрут не найден"), 404


if __name__ == "__main__":
    app.run(port=5102, debug=True)
```
### GET `/items` — 200

Получены три начальных товара.

![GET /items, HTTP 200](screenshots/example-list.png)

### GET `/items/2` — 200

Получен товар с id=2.

![GET /items/2, HTTP 200](screenshots/example-one.png)

### POST `/items` — 201

Команда curl создала товар с id=4 и получила 201. На снимке открыт `http://127.0.0.1:5102/items/4`: GET подтверждает сохранение товара.

![GET /items/4 после POST: новый товар](screenshots/example-post.png)

### PUT `/items/1` — 200

Команда PUT изменила название, цену и количество товара с id=1. На снимке GET `/items/1` показывает обновлённый товар.

![GET /items/1 после PUT: обновлённый товар](screenshots/example-put.png)

### DELETE `/items/3` — 200

Команда DELETE удалила товар с id=3 и вернула 200 с удалённым объектом. На снимке GET `/items/3` возвращает сообщение об отсутствии товара.

![GET /items/3 после DELETE: товар отсутствует](screenshots/example-delete.png)

## Выполнение индивидуального задания

Базовый уровень варианта 10: автомобили с полями `id`, `brand`, `model`.

| Метод и маршрут | Назначение | Код успеха |
| --- | --- | --- |
| GET `/cars` | Все автомобили | 200 |
| GET `/cars/<id>` | Один автомобиль | 200 |
| POST `/cars` | Создать автомобиль | 201 |
| PUT `/cars/<id>` | Обновить автомобиль | 200 |
| DELETE `/cars/<id>` | Удалить автомобиль | 200 |

При отсутствии автомобиля возвращается 404. `find_car()` ищет объект по ID. Счётчик `next_id` назначает новые номера и увеличивается при создании. POST и PUT получают `brand` и `model` из JSON-тела. Данные остаются в памяти до перезапуска сервера.

Исходный файл: [app.py](app.py).

```python
from flask import Flask, abort, jsonify, request

app = Flask(__name__)
app.json.ensure_ascii = False

cars = [
    {"id": 1, "brand": "Toyota", "model": "Camry"},
    {"id": 2, "brand": "BMW", "model": "X3"},
    {"id": 3, "brand": "Toyota", "model": "Corolla"}
]
next_id = 4


def find_car(car_id):
    for car in cars:
        if car["id"] == car_id:
            return car
    abort(404)


@app.get("/cars")
def get_cars():
    return jsonify(cars)


@app.get("/cars/<int:car_id>")
def get_car(car_id):
    return jsonify(find_car(car_id))


@app.post("/cars")
def create_car():
    global next_id
    data = request.get_json()
    car = {"id": next_id, "brand": data["brand"], "model": data["model"]}
    cars.append(car)
    next_id += 1
    return jsonify(car), 201


@app.put("/cars/<int:car_id>")
def update_car(car_id):
    car = find_car(car_id)
    data = request.get_json()
    car["brand"] = data["brand"]
    car["model"] = data["model"]
    return jsonify(car)


@app.delete("/cars/<int:car_id>")
def delete_car(car_id):
    car = find_car(car_id)
    cars.remove(car)
    return jsonify(message="Автомобиль удалён", deleted=car)


@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Автомобиль или маршрут не найден"), 404


if __name__ == "__main__":
    app.run(port=5002, debug=True)
```
### GET `/cars` — 200

Получены все три автомобиля из массива.

![GET /cars, HTTP 200](screenshots/cars-list.png)

### GET `/cars/2` — 200

Получен BMW X3 с id=2.

![GET /cars/2, HTTP 200](screenshots/cars-one.png)

### POST `/cars` — 201

Команда POST создала Honda Civic с id=4 и получила 201. ID назначил сервер. На снимке GET `/cars/4` подтверждает сохранение автомобиля.

![GET /cars/4 после POST: Honda Civic](screenshots/cars-post.png)

### PUT `/cars/4` — 200

Команда PUT заменила Honda Civic на Honda Accord; id=4 сохранился. На снимке GET `/cars/4` показывает обновлённую модель.

![GET /cars/4 после PUT: Honda Accord](screenshots/cars-put.png)

### DELETE `/cars/4` — 200

Команда DELETE удалила автомобиль с id=4 и получила 200 с удалённым объектом. На снимке GET `/cars/4` подтверждает отсутствие автомобиля.

![GET /cars/4 после DELETE: автомобиль отсутствует](screenshots/cars-delete.png)

### GET `/cars/4` — 404

После удаления GET /cars/4 возвращает 404.

![GET /cars/4, HTTP 404](screenshots/cars-404.png)

### PUT `/cars/999` — 404

Команда PUT `/cars/999` получила 404; её ответ сохранён в выводе curl. На снимке GET `/cars/999` показывает отсутствие автомобиля.

![GET /cars/999 после проверки PUT: автомобиль отсутствует](screenshots/cars-put-404.png)

### DELETE `/cars/999` — 404

Команда DELETE `/cars/999` получила 404; её ответ сохранён в выводе curl. На снимке GET `/cars/999` показывает отсутствие автомобиля.

![GET /cars/999 после проверки DELETE: автомобиль отсутствует](screenshots/cars-delete-404.png)

## Проверки и вывод команд

Выполнено **13 запросов curl, все 13 получили ожидаемые коды**. Сохранены 13 настоящих снимков окна Microsoft Edge в формате PNG. На каждом видны адресная строка с конкретным URL эндпоинта и JSON-ответ сервера. Снимки сохранены без изменения содержимого. HTTP-коды приведены по настоящему выводу curl.

Для повторения проверки нужно заново запустить оба сервера и выполнять команды из [curl_commands.txt](curl_commands.txt) по порядку. Полный настоящий вывод заголовков и JSON-ответов сохранён в [command_output.txt](command_output.txt). Для POST и PUT тела запросов лежат в папке `requests`; в командах используются файлы JSON, чтобы избежать ошибок с кавычками в PowerShell.

POST, PUT и DELETE выполнены через curl. После каждой операции в Edge открыт GET-адрес соответствующего объекта: после POST и PUT он показывает сохранённые данные, после DELETE — отсутствие объекта. Коды 201 и 200 для изменяющих запросов подтверждены в [command_output.txt](command_output.txt). Ошибки PUT и DELETE для id=999 также подтверждены curl; на их снимках показан GET того же отсутствующего объекта. Дополнительный клиент [static/check.html](static/check.html) позволяет вручную отправлять разные HTTP-методы.

Для просмотра GET-ответа достаточно открыть указанный URL в Edge. Адресная строка на снимках принадлежит браузеру; ответ получен от запущенного Flask-сервера.

## Контрольные вопросы

### 1. Что такое CRUD?

Create — создать данные, Read — прочитать, Update — обновить, Delete — удалить.

### 2. Какие HTTP-методы соответствуют CRUD?

POST — создание, GET — чтение, PUT — обновление, DELETE — удаление.

### 3. Какой код возвращается при успешном создании ресурса?

201 Created. Во Flask он задаётся вместе с ответом: `return jsonify(car), 201`.

### 4. Какой код возвращается, если ресурс не найден?

404 Not Found. В работе вызывается `abort(404)`, а обработчик ошибки возвращает JSON и код 404.

### 5. Что произойдёт с данными в памяти при перезапуске сервера?

Изменения потеряются. Python заново создаст список из начальных данных, записанных в `app.py`.

## Вывод

Создан Flask-сервер автомобилей для базового уровня варианта 10 и выполнен практический пример товаров. Проверены создание, чтение, обновление, удаление и ошибки 404. Сохранены реальные ответы curl и 13 скриншотов. Закреплены работа с JSON, связь CRUD с HTTP-методами и хранение данных в списке. При проверке потребовалось учитывать порядок запросов: после создания использовать новый ID, а после удаления ожидать 404.

## Источники

1. «Лабораторная работа №2. HTTP-методы: обработка GET, POST, PUT, DELETE» — предоставленная методичка, базовый уровень варианта 10.
2. [Flask — Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/).
3. [Flask — API](https://flask.palletsprojects.com/en/stable/api/).
