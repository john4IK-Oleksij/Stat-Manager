from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Query, Response, status

from .. import schemas
from ..database import Conn
from ..schemas import EntityId
from ..services import category_service, expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=schemas.ExpenseResponse, status_code=201)
def create_expense(payload: schemas.ExpenseCreate, db: Conn) -> dict[str, Any]:
    if category_service.get_category(db, payload.category_id) is None:
        raise HTTPException(404, "Category not found")

    return expense_service.create_expense(db, payload)


@router.get("/", response_model=list[schemas.ExpenseResponse])
def read_expenses(
    db: Conn,
    # Кожен параметр має тип і межі. sort_by та order — лише зі списку (Literal).
    q: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    category_id: Annotated[int | None, Query(ge=1, le=2**63 - 1)] = None,
    sort_by: Literal["spent_on", "amount", "title"] = "spent_on",
    order: Literal["asc", "desc"] = "asc",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=100_000)] = 0,
)  -> list[dict[str, Any]]:
    return expense_service.search_expenses(
        db,
        q=q,
        category_id=category_id,
        sort_by=sort_by,
        order=order,
        limit=limit,
        offset=offset,
    )


@router.get("/{expense_id}", response_model=schemas.ExpenseResponse)
def read_expense(expense_id: EntityId, db: Conn) -> dict[str, Any]:
    expense = expense_service.get_expense(db, expense_id)
    if expense is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return expense


@router.patch("/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(
    expense_id: EntityId,
    payload: schemas.ExpenseUpdate,
    db: Conn,
) -> dict[str, Any]:
    if (
        payload.category_id is not None
        and category_service.get_category(db, payload.category_id) is None
    ):
        raise HTTPException(404, "Category not found")

    expense = expense_service.update_expense(db, expense_id, payload)
    if expense is None:
        raise HTTPException(404, "Expense not found")
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: EntityId, db: Conn) -> Response:
    if not expense_service.delete_expense(db, expense_id):
        raise HTTPException(404, "Expense not found")
    return Response(status_code=204)