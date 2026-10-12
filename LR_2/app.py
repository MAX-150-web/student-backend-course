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
