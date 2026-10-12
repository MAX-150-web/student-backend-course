from flask import Flask, abort, jsonify

app = Flask(__name__)
app.json.ensure_ascii = False

cities = [
    {"id": 1, "name": "Москва", "population": 13000000, "country": "Россия", "area": 2561},
    {"id": 2, "name": "Санкт-Петербург", "population": 5600000, "country": "Россия", "area": 1439},
    {"id": 3, "name": "Новосибирск", "population": 1600000, "country": "Россия", "area": 505},
    {"id": 4, "name": "Екатеринбург", "population": 1500000, "country": "Россия", "area": 1112},
    {"id": 5, "name": "Казань", "population": 1250000, "country": "Россия", "area": 425}
]


def find_city(city_id):
    try:
        city_id = int(city_id)
    except ValueError:
        abort(400)
    for city in cities:
        if city["id"] == city_id:
            return city
    abort(404)


@app.get("/cities")
def get_cities():
    return jsonify(count=len(cities), cities=cities)


@app.get("/cities/<city_id>")
def get_city(city_id):
    return jsonify(find_city(city_id))


@app.get("/cities/<city_id>/area")
def get_city_area(city_id):
    city = find_city(city_id)
    return jsonify(city=city["name"], area=city["area"], unit="км²")


@app.get("/countries/<country>/cities")
def get_country_cities(country):
    result = [city for city in cities if city["country"].lower() == country.lower()]
    return jsonify(country=country, count=len(result), cities=result)


@app.errorhandler(400)
def bad_request(error):
    return jsonify(error="ID должен быть числом"), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Город или маршрут не найден"), 404


if __name__ == "__main__":
    app.run(port=5103, debug=True)
