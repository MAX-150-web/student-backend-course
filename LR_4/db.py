from pathlib import Path
import sqlite3

folder = Path(__file__).resolve().parent
connection = sqlite3.connect(folder / "lab4.db")
cursor = connection.cursor()
connection.set_trace_callback(lambda sql: print(sql.rstrip()))

print("1. CREATE TABLE: таблица автомобилей")
cursor.executescript((folder / "init_db.sql").read_text(encoding="utf-8"))
cursor.execute("PRAGMA table_info(cars)")
for row in cursor.fetchall():
    print(row)

print("\n2. INSERT: пять автомобилей")
cars = [
    ("Toyota", "Camry", 2018),
    ("BMW", "X3", 2020),
    ("Toyota", "Corolla", 2019),
    ("Audi", "A4", 2017),
    ("Kia", "Rio", 2021)
]
cursor.executemany("INSERT INTO cars (brand, model, year) VALUES (?, ?, ?)", cars)
print("Добавлено записей:", cursor.rowcount)

print("\n3. SELECT: все автомобили")
cursor.execute("SELECT * FROM cars")
for row in cursor.fetchall():
    print(row)

print("\n4. WHERE: автомобили Toyota")
cursor.execute("SELECT * FROM cars WHERE brand = ?", ("Toyota",))
for row in cursor.fetchall():
    print(row)

print("\n5. UPDATE: новый год выпуска для id=2")
cursor.execute("UPDATE cars SET year = ? WHERE id = ?", (2022, 2))
print("Обновлено записей:", cursor.rowcount)
cursor.execute("SELECT * FROM cars WHERE id = ?", (2,))
print(cursor.fetchone())

print("\n6. DELETE: удаление автомобиля id=5")
cursor.execute("DELETE FROM cars WHERE id = ?", (5,))
print("Удалено записей:", cursor.rowcount)
cursor.execute("SELECT * FROM cars")
for row in cursor.fetchall():
    print(row)

connection.commit()
connection.close()
print("Изменения сохранены в lab4.db")
