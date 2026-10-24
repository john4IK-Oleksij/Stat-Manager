from typing import Any

from ..database import Connection
from ..database_helpers import execute, fetch_all, fetch_one

# Білий список полів, які дозволено оновлювати: поле → готовий фрагмент SQL.
UPDATABLE = {"name": "name = %(name)s"}


def create(conn: Connection, data: dict[str, Any]) -> dict[str, Any]:
    new_id, _ = execute(
        conn,
        "INSERT INTO categories (name) VALUES (%(name)s)",
        data,
    )
    category = get_by_id(conn, new_id)
    if category is None:
        raise RuntimeError("Не вдалося отримати створену категорію з БД.")
    return category


def get_by_id(conn: Connection, category_id: int) -> dict[str, Any] | None:
    return fetch_one(
        conn,
        "SELECT id, name FROM categories WHERE id = %(id)s",
        {"id": category_id},
    )


def get_all(conn: Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        "SELECT id, name FROM categories ORDER BY id",
    )


def update(
    conn: Connection,
    category_id: int,
    changes: dict[str, Any],
) -> dict[str, Any] | None:
    unknown = set(changes) - set(UPDATABLE)

    if unknown or not changes:
        raise ValueError(
            "Недозволені поля для оновлення: "
            + ", ".join(sorted(unknown))
        )

    # У SQL потрапляють лише фрагменти з білого списку, а не ключі користувача.
    set_sql = ", ".join(
        UPDATABLE[field] for field in UPDATABLE if field in changes
    )
    params = {field: changes[field] for field in UPDATABLE if field in changes}

    execute(
        conn,
        "UPDATE categories SET " + set_sql + " WHERE id = %(id)s",
        {**params, "id": category_id},
    )

    return get_by_id(conn, category_id)


def delete(conn: Connection, category_id: int) -> bool:
    _, deleted = execute(
        conn,
        "DELETE FROM categories WHERE id = %(id)s",
        {"id": category_id},
    )
    return deleted > 0