from fastapi import APIRouter, Query

from .. import schemas
from ..database import Conn
from ..services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=schemas.Summary)
def summary(db: Conn):
    return stats_service.get_summary(db)


@router.get("/by-category", response_model=list[schemas.CategoryStat])
def by_category(db: Conn, min_count: int = Query(0, ge=0, le=1_000_000)):
    return stats_service.by_category(db, min_count)


@router.get("/by-month", response_model=list[schemas.MonthStat])
def by_month(db: Conn):
    return stats_service.by_month(db)