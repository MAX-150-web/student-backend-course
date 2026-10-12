from flask import Flask, abort, jsonify

app = Flask(__name__)
app.json.ensure_ascii = False

cars = [
    {"id": 1, "brand": "Toyota", "model": "Camry"},
    {"id": 2, "brand": "BMW", "model": "X3"},
    {"id": 3, "brand": "Toyota", "model": "Corolla"}
]
owners = {
    1: [{"id": 1, "name": "Иван"}, {"id": 2, "name": "Анна"}],
    2: [{"id": 3, "name": "Максим"}],
    3: []
}


def find_car(car_id):
    try:
        car_id = int(car_id)
    except ValueError:
        abort(400)
    for car in cars:
        if car["id"] == car_id:
            return car
    abort(404)


@app.get("/cars")
def get_cars():
    return jsonify(cars)


@app.get("/cars/<car_id>")
def get_car(car_id):
    return jsonify(find_car(car_id))


@app.get("/cars/<car_id>/owners")
def get_owners(car_id):
    car = find_car(car_id)
    return jsonify(car_id=car["id"], owners=owners[car["id"]])


@app.get("/brands/<brand>/cars")
def get_brand_cars(brand):
    result = [car for car in cars if car["brand"].lower() == brand.lower()]
    return jsonify(brand=brand, cars=result)


@app.errorhandler(400)
def bad_request(error):
    return jsonify(error="ID должен быть числом"), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Автомобиль или маршрут не найден"), 404


if __name__ == "__main__":
    app.run(port=5003, debug=True)
