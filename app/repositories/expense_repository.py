from typing import Any

from ..database import Connection
from ..database_helpers import execute, fetch_all, fetch_one

COLUMNS = "id, title, amount, spent_on, category_id"

# Білий список полів для UPDATE: поле → готовий фрагмент SQL.
UPDATABLE = {
    "title": "title = %(title)s",
    "amount": "amount = %(amount)s",
    "spent_on": "spent_on = %(spent_on)s",
    "category_id": "category_id = %(category_id)s",
}

SORTABLE = {"spent_on": "spent_on", "amount": "amount", "title": "title"}
DIRECTIONS = {"asc": "ASC", "desc": "DESC"}


def create(conn: Connection, data: dict[str, Any]) -> dict[str, Any]:
    new_id, _ = execute(
        conn,
        """
        INSERT INTO expenses (title, amount, spent_on, category_id)
        VALUES (%(title)s, %(amount)s, %(spent_on)s, %(category_id)s)
        """,
        data,
    )
    expense = get_by_id(conn, new_id)
    if expense is None:
        raise RuntimeError("Не вдалося отримати створену витрату з БД.")
    return expense


def get_by_id(conn: Connection, expense_id: int) -> dict[str, Any] | None:
    return fetch_one(
        conn,
        "SELECT id, title, amount, spent_on, category_id FROM expenses WHERE id = %(id)s",
        {"id": expense_id},
    )


def search(
    conn: Connection,
    q: str | None,
    category_id: int | None,
    sort_by: str,
    order: str,
    limit: int,
    offset: int,
    ) -> list[dict[str, Any]]:
    # Умови — лише готові рядки; значення йдуть окремо у params.
    conditions = ["1 = 1"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if category_id is not None:
        conditions.append("category_id = %(category_id)s")
        params["category_id"] = category_id
    if q:
        conditions.append("title LIKE %(q)s ESCAPE '!'")
        escaped = q.replace("!", "!!").replace("%", "!%").replace("_", "!_")
        params["q"] = "%" + escaped + "%"
    order_sql = SORTABLE[sort_by] + " " + DIRECTIONS[order]
    sql = (
        "SELECT "
        + COLUMNS
        + " FROM expenses WHERE "
        + " AND ".join(conditions)
        + " ORDER BY "
        + order_sql
        + ", id ASC LIMIT %(limit)s OFFSET %(offset)s"
    )

    return fetch_all(conn, sql, params)


def update(
    conn: Connection,
    expense_id: int,
    changes: dict[str, Any],
) -> dict[str, Any] | None:
    unknown = set(changes) - set(UPDATABLE)

    if unknown or not changes:
        raise ValueError(
            "Недозволені поля для оновлення: "
            + ", ".join(sorted(unknown))
        )

    set_sql = ", ".join(
        UPDATABLE[field] for field in UPDATABLE if field in changes
    )
    params = {
        field: changes[field]
        for field in UPDATABLE
        if field in changes
    }

    execute(
        conn,
        "UPDATE expenses SET " + set_sql + " WHERE id = %(id)s",
        {**params, "id": expense_id},
    )

    return get_by_id(conn, expense_id)


def delete(conn: Connection, expense_id: int) -> bool:
    _, deleted = execute(
        conn,
        "DELETE FROM expenses WHERE id = %(id)s",
        {"id": expense_id},
    )
    return deleted > 0