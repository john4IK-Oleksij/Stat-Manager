/**
 * Логіка керування витратами (expenses.html)
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Елементи DOM: Фільтри
  const filterSearch = document.getElementById("filterSearch");
  const filterCategory = document.getElementById("filterCategory");
  const filterMonth = document.getElementById("filterMonth");
  const filterSortBy = document.getElementById("filterSortBy");
  const filterOrder = document.getElementById("filterOrder");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  const activeFiltersBadgeBar = document.getElementById("activeFiltersBadgeBar");

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
  let allMonthFilteredExpenses = [];

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

  // 1.5. Відображення плашки активних фільтрів із можливістю швидкого скидання
  function renderActiveFilterBadges() {
    if (!activeFiltersBadgeBar) return;
    const badges = [];

    const q = (filterSearch.value || "").trim();
    if (q) {
      badges.push(`
        <span class="active-filter-pill">
          Пошук: <strong>«${escapeHtml(q)}»</strong>
          <button type="button" class="active-filter-remove" data-clear="search" title="Очистити пошук">&times;</button>
        </span>
      `);
    }

    const catId = filterCategory.value;
    if (catId) {
      const catName = categoriesMap.get(parseInt(catId, 10)) || `ID #${catId}`;
      badges.push(`
        <span class="active-filter-pill">
          Категорія: <strong>${escapeHtml(catName)}</strong>
          <button type="button" class="active-filter-remove" data-clear="category" title="Скинути фільтр за категорією">&times;</button>
        </span>
      `);
    }

    const monthVal = filterMonth && filterMonth.value ? filterMonth.value.trim() : "";
    if (monthVal) {
      badges.push(`
        <span class="active-filter-pill" style="background-color: var(--color-primary-light); color: var(--color-primary); border-color: var(--color-primary);">
          Місяць: <strong>${escapeHtml(monthVal)}</strong>
          <button type="button" class="active-filter-remove" data-clear="month" title="Скинути фільтр за місяцем">&times;</button>
        </span>
      `);
    }

    if (badges.length === 0) {
      activeFiltersBadgeBar.style.display = "none";
      activeFiltersBadgeBar.innerHTML = "";
    } else {
      activeFiltersBadgeBar.style.display = "flex";
      activeFiltersBadgeBar.innerHTML = `
        <span style="font-size: 13px; font-weight: 600; color: var(--color-text-muted);">Активні фільтри:</span>
        ${badges.join("")}
        <button id="clearAllFiltersBadgeBtn" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 11px; margin-left: auto;">Скинути всі</button>
      `;

      activeFiltersBadgeBar.querySelectorAll(".active-filter-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const clearType = btn.dataset.clear;
          const url = new URL(window.location);
          if (clearType === "search") {
            filterSearch.value = "";
          } else if (clearType === "category") {
            filterCategory.value = "";
            url.searchParams.delete("category_id");
            history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
          } else if (clearType === "month") {
            if (filterMonth) filterMonth.value = "";
            url.searchParams.delete("month");
            history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
          }
          currentPage = 1;
          loadExpenses();
        });
      });

      const clearAllBtn = document.getElementById("clearAllFiltersBadgeBtn");
      if (clearAllBtn) {
        clearAllBtn.addEventListener("click", resetAllFilters);
      }
    }
  }

  // 2. Завантаження та відображення списку витрат
  async function loadExpenses() {
    if (!tableBody) return;

    renderActiveFilterBadges();

    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="empty-state-title">Завантаження витрат...</div>
          <div>Отримання даних із сервера</div>
        </td>
      </tr>
    `;

    const selectedMonth = (filterMonth && filterMonth.value ? filterMonth.value.trim() : "");
    const q = (filterSearch.value || "").trim();
    const catId = filterCategory.value;

    const params = {
      sort_by: filterSortBy.value || "spent_on",
      order: filterOrder.value || "desc"
    };

    if (q) params.q = q;
    if (catId) params.category_id = parseInt(catId, 10);

    if (selectedMonth) {
      // При активному місяці завантажуємо повний пул витрат (до 100) для точної фільтрації
      params.limit = 100;
      params.offset = 0;
    } else {
      params.limit = limit;
      params.offset = (currentPage - 1) * limit;
    }

    try {
      const expenses = await Api.getExpenses(params);
      const rawList = Array.isArray(expenses) ? expenses : [];

      if (selectedMonth) {
        allMonthFilteredExpenses = rawList.filter(
          (exp) => exp.spent_on && exp.spent_on.startsWith(selectedMonth)
        );
        const totalCount = allMonthFilteredExpenses.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * limit;
        currentExpensesList = allMonthFilteredExpenses.slice(start, start + limit);
        renderExpensesTable(currentExpensesList);
        updatePaginationControls(currentExpensesList.length, totalCount, selectedMonth);
      } else {
        allMonthFilteredExpenses = [];
        currentExpensesList = rawList;
        renderExpensesTable(currentExpensesList);
        updatePaginationControls(currentExpensesList.length, null, null);
      }
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

  function updatePaginationControls(returnedCount, totalFilteredCount = null, monthFilter = null) {
    if (currentPageBadge) currentPageBadge.textContent = currentPage;

    if (monthFilter !== null && totalFilteredCount !== null) {
      // Клієнтська пагінація за відфільтрованим місяцем
      const startIdx = totalFilteredCount === 0 ? 0 : (currentPage - 1) * limit + 1;
      const endIdx = Math.min((currentPage - 1) * limit + returnedCount, totalFilteredCount);

      if (paginationInfo) {
        if (totalFilteredCount === 0) {
          paginationInfo.textContent = `0 записів за ${monthFilter}`;
        } else {
          paginationInfo.textContent = `Показано ${startIdx}–${endIdx} із ${totalFilteredCount} витрат за ${monthFilter}`;
        }
      }

      if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
      if (nextPageBtn) nextPageBtn.disabled = endIdx >= totalFilteredCount;
    } else {
      // Серверна пагінація
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
      const url = new URL(window.location);
      if (filterCategory.value) {
        url.searchParams.set("category_id", filterCategory.value);
      } else {
        url.searchParams.delete("category_id");
      }
      history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
      loadExpenses();
    });
  }

  if (filterMonth) {
    filterMonth.addEventListener("change", () => {
      currentPage = 1;
      const url = new URL(window.location);
      if (filterMonth.value) {
        url.searchParams.set("month", filterMonth.value);
      } else {
        url.searchParams.delete("month");
      }
      history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
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

  function resetAllFilters() {
    filterSearch.value = "";
    filterCategory.value = "";
    if (filterMonth) filterMonth.value = "";
    filterSortBy.value = "spent_on";
    filterOrder.value = "desc";
    history.replaceState(null, "", "expenses.html");
    currentPage = 1;
    loadExpenses();
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", resetAllFilters);
  }

  // 4. Пагінація
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        if (allMonthFilteredExpenses.length > 0) {
          const start = (currentPage - 1) * limit;
          currentExpensesList = allMonthFilteredExpenses.slice(start, start + limit);
          renderExpensesTable(currentExpensesList);
          updatePaginationControls(currentExpensesList.length, allMonthFilteredExpenses.length, filterMonth.value);
        } else {
          loadExpenses();
        }
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (allMonthFilteredExpenses.length > 0) {
        if (currentPage * limit < allMonthFilteredExpenses.length) {
          currentPage++;
          const start = (currentPage - 1) * limit;
          currentExpensesList = allMonthFilteredExpenses.slice(start, start + limit);
          renderExpensesTable(currentExpensesList);
          updatePaginationControls(currentExpensesList.length, allMonthFilteredExpenses.length, filterMonth.value);
        }
      } else {
        currentPage++;
        loadExpenses();
      }
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

  // 8. Перевірка query-параметрів (перехід по кліку з діаграм або таблиць)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get("category_id");
  if (catParam && filterCategory) {
    filterCategory.value = catParam;
  }
  const monthParam = urlParams.get("month");
  if (monthParam && filterMonth) {
    filterMonth.value = monthParam;
  }

  await loadExpenses();
});
