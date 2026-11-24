from pathlib import Path
import sqlite3

folder = Path(__file__).resolve().parent
connection = sqlite3.connect(folder / "example.db")
cursor = connection.cursor()
connection.set_trace_callback(lambda sql: print(sql.rstrip()))

print("1. CREATE TABLE: таблица городов")
cursor.executescript("""
DROP TABLE IF EXISTS cities;
CREATE TABLE cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    population INTEGER,
    country TEXT DEFAULT 'Россия',
    area REAL
);
""")

print("\n2. INSERT: шесть городов")
cities = [
    ("Москва", 13000000, "Россия", 2561),
    ("Санкт-Петербург", 5600000, "Россия", 1439),
    ("Новосибирск", 1600000, "Россия", 505),
    ("Екатеринбург", 1500000, "Россия", 1112),
    ("Казань", 1250000, "Россия", 425),
    ("Алматы", 2000000, "Казахстан", 682)
]
cursor.executemany("INSERT INTO cities (name, population, country, area) VALUES (?, ?, ?, ?)", cities)
print("Добавлено записей:", cursor.rowcount)

print("\n3. SELECT: все города")
cursor.execute("SELECT * FROM cities")
for row in cursor.fetchall():
    print(row)

print("\n4. WHERE: население больше 1500000")
cursor.execute("SELECT * FROM cities WHERE population > ?", (1500000,))
for row in cursor.fetchall():
    print(row)

print("\n5. UPDATE: население Москвы")
cursor.execute("UPDATE cities SET population = ? WHERE id = ?", (13500000, 1))
print("Обновлено записей:", cursor.rowcount)
cursor.execute("SELECT * FROM cities WHERE id = ?", (1,))
print(cursor.fetchone())

print("\n6. DELETE: удаление Алматы")
cursor.execute("DELETE FROM cities WHERE id = ?", (6,))
print("Удалено записей:", cursor.rowcount)
cursor.execute("SELECT * FROM cities")
for row in cursor.fetchall():
    print(row)

connection.commit()
connection.close()
print("Изменения сохранены в example.db")
