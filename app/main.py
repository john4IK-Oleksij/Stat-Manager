import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mysql.connector import Error as MySQLError
from mysql.connector import IntegrityError, PoolError

from app.config import get_settings
from app.database import create_pool
from app.routers import categories, expenses, stats

logger = logging.getLogger("expense_tracker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = create_pool(get_settings())  # один пул на весь застосунок
    yield


app = FastAPI(title="Expense Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- версія з білим списком
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://127.0.0.1:5173",
#         "http://localhost:5500",  # VS Code Live Server
#         "http://127.0.0.1:5500",
#     ],
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#     allow_headers=["*"],
# )


app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(stats.router)


@app.exception_handler(PoolError)
def pool_error_handler(request: Request, exc: PoolError):
    """Якщо з'єднання з пулу зайняті: просимо повторити пізніше."""
    logger.error("Pool exhausted: %s", exc)
    return JSONResponse(
        {"detail": "Service busy, try again later"},
        status_code=503,
    )


@app.exception_handler(MySQLError)
def mysql_error_handler(request: Request, exc: MySQLError):
    """Помилки бази перетворюємо на безпечні відповіді без тексту SQL і імен таблиць."""
    code = getattr(exc, "errno", None) or 0

    if isinstance(exc, IntegrityError) and code == 1062:  # дублікат UNIQUE
        return JSONResponse(
            {"detail": "Such record already exists"},
            status_code=409,
        )

    if code == 1451:  # RESTRICT: категорія містить витрати
        return JSONResponse(
            {"detail": "Record is in use and cannot be deleted"},
            status_code=409,
        )

    logger.error("MySQL error %s", code)
    return JSONResponse(
        {"detail": "Internal server error"},
        status_code=500,
    )


@app.get("/")
def root():
    return {"message": "Expense Tracker API"}

@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


    