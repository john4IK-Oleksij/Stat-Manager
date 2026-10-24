from typing import Any

from ..database import Connection
from ..repositories import category_repository
from ..schemas import CategoryCreate


def create_category(conn: Connection, payload: CategoryCreate) -> dict[str, Any]:
    category = category_repository.create(conn, payload.model_dump())
    conn.commit()
    return category


def get_category(conn: Connection, category_id: int) -> dict[str, Any] | None:
    return category_repository.get_by_id(conn, category_id)


def get_categories(conn: Connection) -> list[dict[str, Any]]:
    return category_repository.get_all(conn)


def rename_category(
    conn: Connection,
    category_id: int,
    payload: CategoryCreate,
) -> dict[str, Any] | None:
    if category_repository.get_by_id(conn, category_id) is None:
        return None

    category = category_repository.update(
        conn, category_id, payload.model_dump()
    )
    conn.commit()
    return category


def delete_category(conn: Connection, category_id: int) -> bool:
    deleted = category_repository.delete(conn, category_id)
    conn.commit()
    return deleted