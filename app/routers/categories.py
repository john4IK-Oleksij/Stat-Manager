from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from .. import schemas
from ..database import Conn
from ..schemas import EntityId
from ..services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post(
    "/",
    response_model=schemas.CategoryResponse,
    status_code=201,
)
def create_category(payload: schemas.CategoryCreate, db: Conn) -> dict[str, Any]:
    return category_service.create_category(
        db, payload
    )


@router.get("/", response_model=list[schemas.CategoryResponse])
def read_categories(db: Conn) -> list[dict[str, Any]]:
    return category_service.get_categories(db)


@router.get("/{category_id}", response_model=schemas.CategoryResponse)
def read_category(
    category_id: EntityId,
    db: Conn,
) -> dict[str, Any]:
    category = category_service.get_category(db, category_id)
    if category is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Category not found"
        )
    return category


@router.patch(
    "/{category_id}",
    response_model=schemas.CategoryResponse,
)
def rename_category(
    category_id: EntityId,
    payload: schemas.CategoryCreate,
    db: Conn,
) -> dict[str, Any]:
    category = category_service.rename_category(
        db, category_id, payload
    )
    if category is None:
        raise HTTPException(404, "Category not found")
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: EntityId, db: Conn) -> Response:
    if not category_service.delete_category(db, category_id):
        raise HTTPException(404, "Category not found")
    return Response(status_code=204)