/**
 * Логіка керування витратами (expenses.html)
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Елементи DOM: Фільтри
  const filterSearch = document.getElementById("filterSearch");
  const filterCategory = document.getElementById("filterCategory");
  const filterSortBy = document.getElementById("filterSortBy");
  const filterOrder = document.getElementById("filterOrder");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  // Елементи DOM: Таблиця та Пагінація
  const tableBody = document.getElementById("expensesTableBody");
  const paginationInfo = document.getElementById("paginationInfo");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const currentPageBadge = document.getElementById("currentPageBadge");

  // Елементи DOM: Модальна форма витрати
  const openCreateBtn = document.getElementById("openCreateExpenseBtn");
  const modal = document.getElementById("expenseFormModal");
  const modalTitle = document.getElementById("expenseModalTitle");
  const form = document.getElementById("expenseForm");
  const idInput = document.getElementById("expenseId");
  const titleInput = document.getElementById("expenseTitle");
  const titleError = document.getElementById("expenseTitleError");
  const amountInput = document.getElementById("expenseAmount");
  const amountError = document.getElementById("expenseAmountError");
  const spentOnInput = document.getElementById("expenseSpentOn");
  const spentOnError = document.getElementById("expenseSpentOnError");
  const categorySelect = document.getElementById("expenseCategoryId");
  const categoryError = document.getElementById("expenseCategoryIdError");
  const saveBtn = document.getElementById("saveExpenseBtn");

  // Стан сторінки
  let categoriesMap = new Map();
  let currentPage = 1;
  const limit = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_LIMIT) || 20;
  let searchDebounceTimeout = null;
  let currentExpensesList = [];

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " ₴";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    // Якщо формат YYYY-MM-DD
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  }

  function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 1. Завантаження та кешування категорій
  async function loadCategories() {
    try {
      const categories = await Api.getCategories();
      categoriesMap.clear();

      // Очищення селекторів
      filterCategory.innerHTML = '<option value="">Всі категорії</option>';
      categorySelect.innerHTML = '<option value="" disabled selected>Оберіть категорію</option>';

      if (Array.isArray(categories)) {
        categories.forEach((cat) => {
          categoriesMap.set(cat.id, cat.name);

          // Опція для фільтра
          const filterOpt = document.createElement("option");
          filterOpt.value = cat.id;
          filterOpt.textContent = cat.name;
          filterCategory.appendChild(filterOpt);

          // Опція для форми
          const formOpt = document.createElement("option");
          formOpt.value = cat.id;
          formOpt.textContent = cat.name;
          categorySelect.appendChild(formOpt);
        });
      }
    } catch (err) {
      console.warn("Не вдалося завантажити категорії:", err);
    }
  }

  // 2. Завантаження та відображення списку витрат
  async function loadExpenses() {
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="empty-state-title">Завантаження витрат...</div>
          <div>Отримання даних із сервера</div>
        </td>
      </tr>
    `;

    const params = {
      limit: limit,
      offset: (currentPage - 1) * limit,
      sort_by: filterSortBy.value || "spent_on",
      order: filterOrder.value || "desc"
    };

    const q = (filterSearch.value || "").trim();
    if (q) params.q = q;

    const catId = filterCategory.value;
    if (catId) params.category_id = parseInt(catId, 10);

    try {
      const expenses = await Api.getExpenses(params);
      currentExpensesList = Array.isArray(expenses) ? expenses : [];
      renderExpensesTable(currentExpensesList);
      updatePaginationControls(currentExpensesList.length);
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state" style="color: var(--color-danger);">
            <div class="empty-state-title">Помилка завантаження даних</div>
            <div>${escapeHtml(err.message)}</div>
            <button id="retryExpensesBtn" class="btn btn-outline btn-sm" style="margin-top: 12px;">Спробувати знову</button>
          </td>
        </tr>
      `;
      const retryBtn = document.getElementById("retryExpensesBtn");
      if (retryBtn) retryBtn.addEventListener("click", loadExpenses);
      if (paginationInfo) paginationInfo.textContent = "Помилка завантаження";
      if (prevPageBtn) prevPageBtn.disabled = true;
      if (nextPageBtn) nextPageBtn.disabled = true;
    }
  }

  function renderExpensesTable(expenses) {
    if (!tableBody) return;

    if (expenses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-title">Витрат не знайдено</div>
            <div>За обраними параметрами або пошуковим запитом немає записів</div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";
    expenses.forEach((expense) => {
      const tr = document.createElement("tr");

      const categoryName = categoriesMap.get(expense.category_id) || `ID #${expense.category_id}`;

      tr.innerHTML = `
        <td style="font-variant-numeric: tabular-nums; white-space: nowrap;">${escapeHtml(formatDate(expense.spent_on))}</td>
        <td style="font-weight: 600;">${escapeHtml(expense.title)}</td>
        <td>
          <span class="badge badge-category">${escapeHtml(categoryName)}</span>
        </td>
        <td class="col-amount">${escapeHtml(formatMoney(expense.amount))}</td>
        <td class="col-actions">
          <button class="btn btn-icon btn-edit" data-id="${expense.id}" title="Редагувати витрату" aria-label="Редагувати">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn btn-icon btn-delete" data-id="${expense.id}" title="Видалити витрату" aria-label="Видалити" style="color: var(--color-danger);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Обробники для кнопок дій у рядках
    tableBody.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        const exp = currentExpensesList.find((e) => e.id === id);
        if (exp) openEditExpenseModal(exp);
      });
    });

    tableBody.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        const exp = currentExpensesList.find((e) => e.id === id);
        if (exp) confirmDeleteExpense(exp);
      });
    });
  }

  function updatePaginationControls(returnedCount) {
    if (currentPageBadge) currentPageBadge.textContent = currentPage;

    const startIdx = (currentPage - 1) * limit + 1;
    const endIdx = (currentPage - 1) * limit + returnedCount;

    if (paginationInfo) {
      if (returnedCount === 0 && currentPage === 1) {
        paginationInfo.textContent = "0 записів";
      } else if (returnedCount === 0) {
        paginationInfo.textContent = `Сторінка ${currentPage} (порожня)`;
      } else {
        paginationInfo.textContent = `Показано ${startIdx}–${endIdx} записів`;
      }
    }

    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = returnedCount < limit;
  }

  // 3. Обробники подій для фільтрів
  if (filterSearch) {
    filterSearch.addEventListener("input", () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        currentPage = 1;
        loadExpenses();
      }, 350);
    });
  }

  if (filterCategory) {
    filterCategory.addEventListener("change", () => {
      currentPage = 1;
      loadExpenses();
    });
  }

  if (filterSortBy) {
    filterSortBy.addEventListener("change", () => {
      currentPage = 1;
      loadExpenses();
    });
  }

  if (filterOrder) {
    filterOrder.addEventListener("change", () => {
      currentPage = 1;
      loadExpenses();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      filterSearch.value = "";
      filterCategory.value = "";
      filterSortBy.value = "spent_on";
      filterOrder.value = "desc";
      currentPage = 1;
      loadExpenses();
    });
  }

  // 4. Пагінація
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadExpenses();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      currentPage++;
      loadExpenses();
    });
  }

  // 5. Відкриття та збереження форми витрати
  function openCreateExpenseModal() {
    if (!modal) return;
    modalTitle.textContent = "Нова витрата";
    idInput.value = "";
    titleInput.value = "";
    amountInput.value = "";
    spentOnInput.value = getTodayString();
    categorySelect.value = "";

    clearFieldErrors();
    modal.classList.add("open");
    setTimeout(() => titleInput.focus(), 100);
  }

  function openEditExpenseModal(expense) {
    if (!modal) return;
    modalTitle.textContent = "Редагування витрати";
    idInput.value = expense.id;
    titleInput.value = expense.title || "";
    amountInput.value = expense.amount !== undefined ? expense.amount : "";
    spentOnInput.value = expense.spent_on || getTodayString();
    categorySelect.value = expense.category_id || "";

    clearFieldErrors();
    modal.classList.add("open");
    setTimeout(() => titleInput.focus(), 100);
  }

  function clearFieldErrors() {
    [titleError, amountError, spentOnError, categoryError].forEach((el) => {
      if (el) {
        el.textContent = "";
        el.style.display = "none";
      }
    });
    [titleInput, amountInput, spentOnInput, categorySelect].forEach((el) => {
      if (el) el.classList.remove("is-invalid");
    });
  }

  function showInputError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add("is-invalid");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = "block";
    }
  }

  if (openCreateBtn) {
    openCreateBtn.addEventListener("click", openCreateExpenseModal);
  }

  // Обробка відправки форми
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors();

      const id = idInput.value;
      const title = (titleInput.value || "").trim();
      const rawAmount = amountInput.value;
      const spentOn = spentOnInput.value;
      const categoryId = categorySelect.value;

      let hasErrors = false;

      // Валідація назви
      if (!title) {
        showInputError(titleInput, titleError, "Вкажіть назву витрати");
        hasErrors = true;
      } else if (title.length > 100) {
        showInputError(titleInput, titleError, "Назва не може перевищувати 100 символів");
        hasErrors = true;
      }

      // Валідація суми
      const amount = parseFloat(rawAmount);
      if (!rawAmount || isNaN(amount) || amount <= 0) {
        showInputError(amountInput, amountError, "Сума повинна бути додатним числом");
        hasErrors = true;
      } else if (amount > 1000000000) {
        showInputError(amountInput, amountError, "Сума не може перевищувати 1 000 000 000 ₴");
        hasErrors = true;
      } else {
        // Перевірка знаків після коми
        const decimalParts = rawAmount.split(".");
        if (decimalParts.length > 1 && decimalParts[1].length > 2) {
          showInputError(amountInput, amountError, "Максимум два знаки після коми");
          hasErrors = true;
        }
      }

      // Валідація дати
      if (!spentOn) {
        showInputError(spentOnInput, spentOnError, "Оберіть дату витрати");
        hasErrors = true;
      }

      // Валідація категорії
      if (!categoryId) {
        showInputError(categorySelect, categoryError, "Оберіть категорію витрати");
        hasErrors = true;
      }

      if (hasErrors) return;

      saveBtn.disabled = true;
      const originalBtnText = saveBtn.innerHTML;
      saveBtn.textContent = "Збереження...";

      const payload = {
        title: title,
        amount: Math.round(amount * 100) / 100,
        spent_on: spentOn,
        category_id: parseInt(categoryId, 10)
      };

      try {
        if (id) {
          // Оновлення наявної витрати
          await Api.updateExpense(id, payload);
          modal.classList.remove("open");
          Notifications.showSuccess("Зміни збережено");
        } else {
          // Створення нової витрати
          await Api.createExpense(payload);
          modal.classList.remove("open");
          Notifications.showSuccess("Витрату створено");
        }
        await loadExpenses();
      } catch (err) {
        Modal.showError({
          title: id ? "Помилка збереження" : "Помилка створення",
          message: err.message,
          code: err.status
        });
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
      }
    });
  }

  // 6. Видалення витрати з підтвердженням
  function confirmDeleteExpense(expense) {
    Modal.showConfirm({
      title: "Видалення витрати",
      message: `Видалити витрату «${expense.title}» на суму ${formatMoney(expense.amount)}? Цю дію не можна скасувати.`,
      confirmText: "Видалити",
      cancelText: "Скасувати",
      onConfirm: async () => {
        try {
          await Api.deleteExpense(expense.id);
          Notifications.showSuccess("Витрату видалено");

          // Якщо видалили останній елемент на сторінці (а сторінка не перша), переходимо назад
          if (currentExpensesList.length === 1 && currentPage > 1) {
            currentPage--;
          }
          await loadExpenses();
        } catch (err) {
          Modal.showError({
            title: "Не вдалося видалити витрату",
            message: err.message,
            code: err.status
          });
        }
      }
    });
  }

  // 7. Перевірка хешу URL (якщо прийшли з кнопки «Додати витрату» на головній)
  if (window.location.hash === "#new") {
    // Очистити хеш без перезавантаження
    history.replaceState(null, null, "expenses.html");
    setTimeout(openCreateExpenseModal, 250);
  }

  // Початкове завантаження
  await loadCategories();
  await loadExpenses();
});
