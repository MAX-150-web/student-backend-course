from pathlib import Path
import ast
import io
import re
import sqlite3
import subprocess
import sys
import tokenize

lab = Path(__file__).resolve().parent
results = lab / "results"
results.mkdir(exist_ok=True)
checks = [f"Python {sys.version.split()[0]}", f"SQLite {sqlite3.sqlite_version}", ""]


def check(condition, description):
    assert condition, description
    checks.append("PASS: " + description)
    print(checks[-1], flush=True)


def run(filename):
    process = subprocess.run([sys.executable, "-X", "utf8", str(lab / filename)],
                             capture_output=True, check=True, cwd=lab)
    assert not process.stderr, process.stderr.decode("utf-8")
    return process.stdout.decode("utf-8").replace("\r\n", "\n")


def sections(output):
    chunks = re.split(r"(?m)(?=^[1-6]\. )", output)
    return [chunk for chunk in chunks if chunk.strip()]


def rows(section):
    return [ast.literal_eval(line) for line in section.splitlines() if line.startswith("(")]


output = run("db.py")
parts = sections(output)
assert len(parts) == 6
(lab / "command_output.txt").write_text(output, encoding="utf-8-sig", newline="\n")
for name, part in zip(["create-table", "insert", "select-all", "select-where", "update", "delete"], parts):
    (results / (name + ".txt")).write_text(part.rstrip() + "\n", encoding="utf-8-sig", newline="\n")

expected = [(1, "Toyota", "Camry", 2018), (2, "BMW", "X3", 2020),
            (3, "Toyota", "Corolla", 2019), (4, "Audi", "A4", 2017), (5, "Kia", "Rio", 2021)]
check("CREATE TABLE cars" in parts[0], "CREATE TABLE: таблица cars создана")
check("Добавлено записей: 5" in parts[1], "INSERT: добавлены пять автомобилей")
check(rows(parts[2]) == expected, "SELECT *: получены все пять исходных записей")
check(rows(parts[3]) == [expected[0], expected[2]], "WHERE brand = 'Toyota': получены только две Toyota")
check("Обновлено записей: 1" in parts[4] and rows(parts[4]) == [(2, "BMW", "X3", 2022)],
      "UPDATE: изменён только year автомобиля id=2")
expected_final = expected[:4]
expected_final[1] = (2, "BMW", "X3", 2022)
check("Удалено записей: 1" in parts[5] and rows(parts[5]) == expected_final,
      "DELETE: удалён только автомобиль id=5, осталось четыре записи")

with sqlite3.connect(lab / "lab4.db") as connection:
    tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").fetchall()
    schema = connection.execute("PRAGMA table_info(cars)").fetchall()
    check(tables == [("cars",)] and [(row[1], row[2]) for row in schema] ==
          [("id", "INTEGER"), ("brand", "TEXT"), ("model", "TEXT"), ("year", "INTEGER")] and schema[0][5] == 1,
          "Схема: одна пользовательская таблица, четыре поля, id — первичный ключ")
    check(connection.execute("SELECT * FROM cars").fetchall() == expected_final,
          "COMMIT: данные сохранились после закрытия и повторного открытия БД")
check(run("db.py") == output, "Повторный запуск: те же ID и результаты, записи не дублируются")

example = run("example.py")
example_parts = sections(example)
assert len(example_parts) == 6
(lab / "example_output.txt").write_text(example, encoding="utf-8-sig", newline="\n")
for name, part in [("example-create-insert", example_parts[0] + example_parts[1]),
                   ("example-select-where", example_parts[2] + example_parts[3]),
                   ("example-update-delete", example_parts[4] + example_parts[5])]:
    (results / (name + ".txt")).write_text(part.rstrip() + "\n", encoding="utf-8-sig", newline="\n")
check(len(rows(example_parts[2])) == 6 and [row[0] for row in rows(example_parts[3])] == [1, 2, 3, 6],
      "Практический пример: шесть городов, WHERE отбирает четыре города")
with sqlite3.connect(lab / "example.db") as connection:
    saved_cities = connection.execute("SELECT * FROM cities").fetchall()
    check(len(saved_cities) == 5 and saved_cities[0][2] == 13500000 and all(row[0] != 6 for row in saved_cities),
          "Практический пример: население Москвы обновлено, Алматы удалён, изменения сохранены")
check(run("example.py") == example, "Практический пример: повторный запуск воспроизводит результат")

for filename in ["db.py", "example.py"]:
    source = (lab / filename).read_text(encoding="utf-8")
    compile(source, filename, "exec")
    check(not any(token.type == tokenize.COMMENT for token in tokenize.generate_tokens(io.StringIO(source).readline)),
          f"{filename}: синтаксис корректен, комментариев в коде нет")

checks += ["", "Итог: все 14 проверок пройдены."]
assert sum(line.startswith("PASS:") for line in checks) == 14
(lab / "checks.txt").write_text("\n".join(checks) + "\n", encoding="utf-8-sig", newline="\n")
print(checks[-1], flush=True)
