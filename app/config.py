import os
from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MYSQL_",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = Field(default=3306, ge=1, le=65535)
    database: str = "expense_tracker"
    user: str = "root"
    password: SecretStr = Field(default=SecretStr(""))

    def __init__(self, **values):
        # 1. Перевіряємо URL підключення (MYSQL_URL або DATABASE_URL від Railway)
        db_url = os.environ.get("MYSQL_URL") or os.environ.get("DATABASE_URL")
        if db_url:
            parsed = urlparse(db_url)
            if parsed.hostname:
                values.setdefault("host", parsed.hostname)
            if parsed.port:
                values.setdefault("port", parsed.port)
            if parsed.username:
                values.setdefault("user", parsed.username)
            if parsed.password:
                values.setdefault("password", SecretStr(parsed.password))
            if parsed.path and parsed.path.lstrip("/"):
                values.setdefault("database", parsed.path.lstrip("/"))

        # 2. Перевіряємо змінні без підкреслення від Railway (MYSQLHOST, MYSQLPORT тощо)
        if "host" not in values and os.environ.get("MYSQLHOST"):
            values["host"] = os.environ["MYSQLHOST"]
        if "port" not in values and os.environ.get("MYSQLPORT"):
            values["port"] = int(os.environ["MYSQLPORT"])
        if "user" not in values and os.environ.get("MYSQLUSER"):
            values["user"] = os.environ["MYSQLUSER"]
        if "password" not in values and os.environ.get("MYSQLPASSWORD"):
            values["password"] = SecretStr(os.environ["MYSQLPASSWORD"])
        if "database" not in values and os.environ.get("MYSQLDATABASE"):
            values["database"] = os.environ["MYSQLDATABASE"]

        super().__init__(**values)


@lru_cache
def get_settings() -> Settings:
    return Settings()
