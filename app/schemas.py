from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

# Перший рубіж захисту: перевіряємо ввід ще до звернення до бази.
# Рядки без пробілів по краях; довжини збігаються з обмеженнями в таблицях.
Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]

Title = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]

Money = Annotated[
    Decimal,
    Field(gt=0, le=1_000_000_000, max_digits=12, decimal_places=2),
]

EntityId = Annotated[int, Field(ge=1, le=2**63 - 1)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")  # зайві поля — помилка (наприклад, "id") → 422


# ---------- Category
class CategoryCreate(Strict):
    name: Name


class CategoryResponse(BaseModel):
    id: int
    name: str


# ---------- Expense
class ExpenseCreate(Strict):
    title: Title
    amount: Money
    spent_on: date
    category_id: EntityId


class ExpenseUpdate(Strict):
    """Часткове оновлення: можна передати лише ті поля, які дозволено змінювати."""

    title: Title | None = None
    amount: Money | None = None
    spent_on: date | None = None
    category_id: EntityId | None = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        sent = self.model_dump(exclude_unset=True)
        if not sent or any(v is None for v in sent.values()):
            raise ValueError(
                "Передайте хоча б одне поле, значення не можуть бути null"
            )
        return self


class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    spent_on: date
    category_id: int


# ---------- Summary
class Summary(BaseModel):
    expenses_count: int
    total_amount: float
    avg_amount: float | None
    min_amount: float | None
    max_amount: float | None


class CategoryStat(BaseModel):
    id: int
    name: str
    expenses_count: int
    total_amount: float
    avg_amount: float | None


class MonthStat(BaseModel):
    month: str
    expenses_count: int
    total_amount: float