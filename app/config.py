from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MYSQL_", 
        extra="ignore"
    )

    host: str = "127.0.0.1"
    port: int = Field(3306, ge=1, le=65535)
    database: str = "expense_tracker"
    user: str
    password: SecretStr = Field(
        min_length=12
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue]