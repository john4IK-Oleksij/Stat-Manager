from typing import Any

from ..database import Connection
from ..database_helpers import fetch_all, fetch_one


def get_summary(conn: Connection) -> dict[str, Any]:
    result = fetch_one(
        conn,
        """
        SELECT
            COUNT(id) AS expenses_count,
            COALESCE(SUM(amount), 0) AS total_amount,
            AVG(amount) AS avg_amount,
            MIN(amount) AS min_amount,
            MAX(amount) AS max_amount
        FROM expenses
        """,
    )
    if result is None:
        raise RuntimeError("Не вдалося отримати загальну статистику.")
    return result


def by_category(conn: Connection, min_count: int = 0) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        SELECT
            c.id,
            c.name,
            COUNT(e.id) AS expenses_count,
            COALESCE(SUM(e.amount), 0) AS total_amount,
            AVG(e.amount) AS avg_amount
        FROM categories AS c
        LEFT JOIN expenses AS e ON e.category_id = c.id
        GROUP BY c.id, c.name
        HAVING COUNT(e.id) >= %(min_count)s
        ORDER BY total_amount DESC, c.name
        """,
        {"min_count": min_count},
    )


def by_month(conn: Connection) -> list[dict[str, Any]]:
    # Параметрів немає, тому '%m' не потрібно подвоювати.
    return fetch_all(
        conn,
        """
        SELECT
            DATE_FORMAT(spent_on, '%Y-%m') AS month,
            COUNT(id) AS expenses_count,
            SUM(amount) AS total_amount
        FROM expenses
        GROUP BY month
        ORDER BY month
        """,
    )