from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request
from mysql.connector import pooling
from mysql.connector.constants import ClientFlag
from mysql.connector.pooling import MySQLConnectionPool, PooledMySQLConnection

from .config import Settings

Connection = PooledMySQLConnection

POOL_SIZE = 5

# Суворий режим сеансу: помилка замість мовчазного обрізання рядків чи нульових дат.
SQL_MODE = (
    "STRICT_ALL_TABLES,ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,NO_ZERO_DATE,"
    "ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION"
)


def create_pool(settings: Settings) -> MySQLConnectionPool:
    return pooling.MySQLConnectionPool(
        pool_name="expense_pool",
        pool_size=POOL_SIZE,
        host=settings.host,
        port=settings.port,
        user=settings.user,
        password=settings.password.get_secret_value(),
        database=settings.database,
        ssl_ca=str(Path(__file__).resolve().parent.parent / "ca.pem"),
        ssl_verify_cert=True,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=False,
        sql_mode=SQL_MODE,
        connection_timeout=5,
        client_flags=[-ClientFlag.MULTI_STATEMENTS],
    )


def get_conn(request: Request) -> Iterator[Connection]:
    conn = request.app.state.pool.get_connection()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()  # повертає з'єднання в пул


Conn = Annotated[Connection, Depends(get_conn)]