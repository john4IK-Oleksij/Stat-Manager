import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from mysql.connector import Error as MySQLError
from mysql.connector import IntegrityError, PoolError

from app.config import get_settings
from app.database import create_pool
from app.routers import categories, expenses, stats
from app.seed import init_and_seed_db

logger = logging.getLogger("expense_tracker")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = create_pool(get_settings())
    # Створюємо таблиці та відновлюємо початкові дані
    init_and_seed_db(app.state.pool)
    yield


app = FastAPI(title="Expense Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(stats.router)


@app.exception_handler(PoolError)
def pool_error_handler(request: Request, exc: PoolError):
    logger.error("Pool exhausted: %s", exc)
    return JSONResponse(
        {"detail": "Service busy, try again later"},
        status_code=503,
    )


@app.exception_handler(MySQLError)
def mysql_error_handler(request: Request, exc: MySQLError):
    code = getattr(exc, "errno", None) or 0

    if isinstance(exc, IntegrityError) and code == 1062:
        return JSONResponse(
            {"detail": "Such record already exists"},
            status_code=409,
        )

    if code == 1451:
        return JSONResponse(
            {"detail": "Record is in use and cannot be deleted"},
            status_code=409,
        )

    logger.error("MySQL error %s", code)
    return JSONResponse(
        {"detail": "Internal server error"},
        status_code=500,
    )


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# Статичні файли (css, js, assets)
for folder in ("css", "js", "assets"):
    folder_path = FRONTEND_DIR / folder
    if folder_path.is_dir():
        app.mount(f"/{folder}", StaticFiles(directory=str(folder_path)), name=folder)

# Головна сторінка
@app.get("/", include_in_schema=False)
def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/favicon.png", include_in_schema=False)
def serve_favicon():
    return FileResponse(str(FRONTEND_DIR / "favicon.png"))

# Інші HTML-сторінки
@app.get("/{page_name}.html", include_in_schema=False)
def serve_html(page_name: str):
    page_path = (FRONTEND_DIR / f"{page_name}.html").resolve()
    if page_path.parent != FRONTEND_DIR.resolve() or not page_path.is_file():
        return FileResponse(str(FRONTEND_DIR / "index.html"))
    return FileResponse(str(page_path))
