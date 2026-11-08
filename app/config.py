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
        # 1. Якщо на Railway підключено сервіс MySQL — використовуємо його автоматичні змінні
        if os.environ.get("MYSQLHOST"):
            values["host"] = os.environ["MYSQLHOST"]
            values["port"] = int(os.environ.get("MYSQLPORT", 3306))
            values["user"] = os.environ.get("MYSQLUSER", "root")
            values["password"] = SecretStr(os.environ.get("MYSQLPASSWORD", ""))
            values["database"] = os.environ.get("MYSQLDATABASE", "railway")
        # 2. Або єдиний URL підключення
        elif os.environ.get("MYSQL_URL") or os.environ.get("DATABASE_URL"):
            db_url = os.environ.get("MYSQL_URL") or os.environ.get("DATABASE_URL")
            parsed = urlparse(db_url)
            if parsed.hostname:
                values["host"] = parsed.hostname
            if parsed.port:
                values["port"] = parsed.port
            if parsed.username:
                values["user"] = parsed.username
            if parsed.password:
                values["password"] = SecretStr(parsed.password)
            if parsed.path and parsed.path.lstrip("/"):
                values["database"] = parsed.path.lstrip("/")

        super().__init__(**values)


@lru_cache
def get_settings() -> Settings:
    return Settings()
