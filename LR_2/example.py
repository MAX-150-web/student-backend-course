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
