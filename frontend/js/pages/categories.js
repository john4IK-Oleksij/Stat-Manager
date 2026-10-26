/**
 * Логіка керування категоріями (categories.html)
 */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("categoriesContainer");
  const countBadge = document.getElementById("categoriesCountBadge");
  const createForm = document.getElementById("createCategoryForm");
  const newNameInput = document.getElementById("newCategoryName");
  const newNameError = document.getElementById("newCategoryError");
  const createBtn = document.getElementById("createCategoryBtn");

  const editModal = document.getElementById("editCategoryModal");
  const editForm = document.getElementById("editCategoryForm");
  const editIdInput = document.getElementById("editCategoryId");
  const editNameInput = document.getElementById("editCategoryName");
  const editNameError = document.getElementById("editCategoryError");
  const editSaveBtn = document.getElementById("saveEditCategoryBtn");

  let expensesCountMap = new Map();

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCountLabel(count) {
    if (count === 1) return "1 витрата";
    if (count >= 2 && count <= 4) return `${count} витрати`;
    return `${count} витрат`;
  }

  // Завантаження категорій та статистики прив'язаних витрат
  async function loadCategories() {
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Завантаження категорій...</div>
        <div>Отримання даних із сервера</div>
      </div>
    `;

    try {
      // Отримуємо категорії та кількість витрат у кожній
      const [categories, stats] = await Promise.all([
        Api.getCategories(),
        Api.getStatsByCategory(0).catch(() => [])
      ]);

      expensesCountMap.clear();
      if (Array.isArray(stats)) {
        stats.forEach((st) => expensesCountMap.set(st.id, Number(st.expenses_count) || 0));
      }

      renderCategories(categories);
    } catch (err) {
      container.innerHTML = `
        <div class="placeholder-box" style="border-color: var(--color-danger); background-color: var(--color-danger-bg);">
          <div class="empty-state-title" style="color: var(--color-danger);">Помилка завантаження категорій</div>
          <div>${escapeHtml(err.message)}</div>
          <button id="retryLoadBtn" class="btn btn-outline btn-sm" style="margin-top: 12px;">Спробувати знову</button>
        </div>
      `;
      const retryBtn = document.getElementById("retryLoadBtn");
      if (retryBtn) retryBtn.addEventListener("click", loadCategories);

      if (countBadge) countBadge.textContent = "Помилка";
    }
  }

  // Відображення списку категорій у вигляді grid-сітки
  function renderCategories(categories) {
    if (!container) return;

    if (!Array.isArray(categories) || categories.length === 0) {
      if (countBadge) countBadge.textContent = "0 категорій";
      container.innerHTML = `
        <div class="placeholder-box">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </div>
          <div class="empty-state-title">Категорій ще немає</div>
          <div>Створіть свою першу категорію за допомогою форми вище</div>
        </div>
      `;
      return;
    }

    if (countBadge) {
      countBadge.textContent = `${categories.length} ${
        categories.length === 1 ? "категорія" : (categories.length >= 2 && categories.length <= 4 ? "категорії" : "категорій")
      }`;
    }

    const grid = document.createElement("div");
    grid.className = "categories-grid";

    categories.forEach((cat) => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.dataset.id = cat.id;

      const count = expensesCountMap.get(cat.id) || 0;
      const countLabel = getCountLabel(count);
      const countBadgeClass = count > 0 ? "badge-category" : "badge-info";

      card.innerHTML = `
        <div class="category-card-header">
          <span class="category-name">${escapeHtml(cat.name)}</span>
          <span class="badge ${countBadgeClass}">${countLabel}</span>
        </div>
        <div class="category-card-actions">
          <button class="btn btn-outline btn-sm btn-edit" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" title="Перейменувати">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Редагувати
          </button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" data-count="${count}" title="Видалити категорію">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Видалити
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(grid);

    // Обробники на кнопки карток
    grid.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        openEditModal(btn.dataset.id, btn.dataset.name);
      });
    });

    grid.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const count = parseInt(btn.dataset.count, 10) || 0;
        confirmDeleteCategory(btn.dataset.id, btn.dataset.name, count);
      });
    });
  }

  // 1. Створення категорії
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (newNameInput.value || "").trim();

      if (!name) {
        showErrorField(newNameError, "Введіть назву категорії");
        newNameInput.classList.add("is-invalid");
        newNameInput.focus();
        return;
      }

      if (name.length > 50) {
        showErrorField(newNameError, "Назва не може перевищувати 50 символів");
        newNameInput.classList.add("is-invalid");
        return;
      }

      hideErrorField(newNameError);
      newNameInput.classList.remove("is-invalid");

      createBtn.disabled = true;
      const originalBtnText = createBtn.innerHTML;
      createBtn.textContent = "Збереження...";

      try {
        await Api.createCategory(name);
        newNameInput.value = "";
        Notifications.showSuccess("Категорію створено");
        await loadCategories();
      } catch (err) {
        if (err.status === 409) {
          Modal.showError({
            title: "Помилка створення",
            message: "Категорія з такою назвою вже існує. Оберіть іншу назву.",
            code: 409
          });
        } else {
          Modal.showError({
            title: "Не вдалося створити категорію",
            message: err.message,
            code: err.status
          });
        }
      } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = originalBtnText;
      }
    });

    newNameInput.addEventListener("input", () => {
      hideErrorField(newNameError);
      newNameInput.classList.remove("is-invalid");
    });
  }

  // 2. Перейменування категорії (Модальне вікно)
  function openEditModal(id, currentName) {
    if (!editModal) return;
    editIdInput.value = id;
    editNameInput.value = currentName || "";
    hideErrorField(editNameError);
    editNameInput.classList.remove("is-invalid");
    editModal.classList.add("open");
    setTimeout(() => editNameInput.focus(), 100);
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = editIdInput.value;
      const newName = (editNameInput.value || "").trim();

      if (!newName) {
        showErrorField(editNameError, "Назва не може бути порожньою");
        editNameInput.classList.add("is-invalid");
        editNameInput.focus();
        return;
      }

      if (newName.length > 50) {
        showErrorField(editNameError, "Максимум 50 символів");
        editNameInput.classList.add("is-invalid");
        return;
      }

      hideErrorField(editNameError);
      editNameInput.classList.remove("is-invalid");

      editSaveBtn.disabled = true;
      editSaveBtn.textContent = "Збереження...";

      try {
        await Api.renameCategory(id, newName);
        editModal.classList.remove("open");
        Notifications.showSuccess("Категорію перейменовано");
        await loadCategories();
      } catch (err) {
        if (err.status === 409) {
          Modal.showError({
            title: "Помилка перейменування",
            message: "Категорія з такою назвою вже існує. Оберіть іншу назву.",
            code: 409
          });
        } else {
          Modal.showError({
            title: "Не вдалося перейменувати категорію",
            message: err.message,
            code: err.status
          });
        }
      } finally {
        editSaveBtn.disabled = false;
        editSaveBtn.textContent = "Зберегти";
      }
    });

    editNameInput.addEventListener("input", () => {
      hideErrorField(editNameError);
      editNameInput.classList.remove("is-invalid");
    });
  }

  // 3. Видалення категорії (перевірка зайнятості та захист від видалення)
  function confirmDeleteCategory(id, name, count) {
    // Якщо категорія зайнята витратами — одразу показуємо зрозуміле попередження без марного діалогу
    if (count > 0) {
      Modal.showError({
        title: "Заборонено видаляти",
        message: `Категорія «${name}» зараз містить ${getCountLabel(count)}. Сервер не дозволяє видаляти категорію, до якої прив'язані записи витрат. Спочатку видаліть або змініть ці витрати.`,
        code: 409
      });
      return;
    }

    // Якщо категорія вільна (0 витрат) — запитуємо підтвердження
    Modal.showConfirm({
      title: "Видалення категорії",
      message: `Видалити категорію «${name}»? Цю дію не можна скасувати.`,
      confirmText: "Видалити",
      cancelText: "Скасувати",
      onConfirm: async () => {
        try {
          await Api.deleteCategory(id);
          Notifications.showSuccess("Категорію видалено");
          await loadCategories();
        } catch (err) {
          if (err.status === 409) {
            Modal.showError({
              title: "Заборонено видаляти",
              message: "Ця категорія використовується у витратах і не може бути видалена.",
              code: 409
            });
          } else {
            Modal.showError({
              title: "Помилка видалення",
              message: err.message,
              code: err.status
            });
          }
        }
      }
    });
  }

  function showErrorField(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }

  function hideErrorField(el) {
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  // Початковий старт
  loadCategories();
});
