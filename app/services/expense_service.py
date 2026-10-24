from typing import Any

from ..database import Connection
from ..repositories import expense_repository
from ..schemas import ExpenseCreate, ExpenseUpdate


def create_expense(conn: Connection, payload: ExpenseCreate) -> dict[str, Any]:
    expense = expense_repository.create(conn, payload.model_dump())
    conn.commit()
    return expense


def get_expense(conn: Connection, expense_id: int) -> dict[str, Any] | None:
    return expense_repository.get_by_id(conn, expense_id)


def search_expenses(
    conn: Connection,
    **filters: Any,
) -> list[dict[str, Any]]:
    return expense_repository.search(conn, **filters)


def update_expense(
    conn: Connection,
    expense_id: int,
    payload: ExpenseUpdate,
) -> dict[str, Any] | None:
    if expense_repository.get_by_id(conn, expense_id) is None:
        return None

    # exclude_unset: до UPDATE потрапляють лише поля, які клієнт справді передав.
    expense = expense_repository.update(
        conn, expense_id, payload.model_dump(exclude_unset=True)
    )

    conn.commit()
    return expense


def delete_expense(conn: Connection, expense_id: int) -> bool:
    deleted = expense_repository.delete(conn, expense_id)
    conn.commit()
    return deleted