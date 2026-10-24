from typing import Any

from ..database import Connection
from ..repositories import stats_repository


def get_summary(conn: Connection) -> dict[str, Any]:
    return stats_repository.get_summary(conn)


def by_category(conn: Connection, min_count: int = 0) -> list[dict[str, Any]]:
    return stats_repository.by_category(conn, min_count)


def by_month(conn: Connection) -> list[dict[str, Any]]:
    return stats_repository.by_month(conn)