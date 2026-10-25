/**
 * Логіка сторінки «Статистика» (statistics.html)
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Блок 1: Загальна статистика
  const countEl = document.getElementById("statExpensesCount");
  const totalEl = document.getElementById("statTotalAmount");
  const avgEl = document.getElementById("statAvgAmount");
  const minEl = document.getElementById("statMinAmount");
  const maxEl = document.getElementById("statMaxAmount");

  // Блок 2: Категорії
  const categoryDonutContainer = document.getElementById("statCategoryDonutContainer");
  const categoryTableBody = document.getElementById("statCategoryTableBody");

  // Блок 3: Місяці
  const monthBarContainer = document.getElementById("statMonthBarContainer");
  const monthTableBody = document.getElementById("statMonthTableBody");

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

  // 1. Загальна статистика
  async function loadSummary() {
    try {
      const data = await Api.getStatsSummary();
      if (data) {
        if (countEl) countEl.textContent = data.expenses_count ?? 0;
        if (totalEl) totalEl.textContent = formatMoney(data.total_amount);
        if (avgEl) avgEl.textContent = formatMoney(data.avg_amount || 0);
        if (minEl) minEl.textContent = formatMoney(data.min_amount || 0);
        if (maxEl) maxEl.textContent = formatMoney(data.max_amount || 0);
      }
    } catch (err) {
      console.warn("Помилка завантаження загальної статистики:", err);
      [countEl, totalEl, avgEl, minEl, maxEl].forEach((el) => {
        if (el) el.textContent = "—";
      });
    }
  }

  // 2. Статистика за категоріями
  async function loadCategoryStats() {
    try {
      const stats = await Api.getStatsByCategory(0);

      // Відображення діаграми
      Charts.renderDonut(categoryDonutContainer, stats);

      // Відображення таблиці
      if (!categoryTableBody) return;

      if (!Array.isArray(stats) || stats.length === 0) {
        categoryTableBody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <div class="empty-state-title">Категорій не знайдено</div>
              <div>Створіть категорії та додайте витрати для розрахунку</div>
            </td>
          </tr>
        `;
        return;
      }

      categoryTableBody.innerHTML = "";
      stats.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight: 600;">${escapeHtml(item.name)}</td>
          <td style="text-align: center; font-variant-numeric: tabular-nums;">${item.expenses_count}</td>
          <td class="col-amount">${formatMoney(item.total_amount)}</td>
          <td class="col-amount" style="color: var(--color-text-muted);">${formatMoney(item.avg_amount || 0)}</td>
        `;
        categoryTableBody.appendChild(tr);
      });
    } catch (err) {
      if (categoryTableBody) {
        categoryTableBody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state" style="color: var(--color-danger);">
              <div class="empty-state-title">Помилка завантаження статистики категорій</div>
              <div>${escapeHtml(err.message)}</div>
            </td>
          </tr>
        `;
      }
    }
  }

  // 3. Статистика за місяцями
  async function loadMonthStats() {
    try {
      const stats = await Api.getStatsByMonth();

      // Відображення графіка
      Charts.renderBarChart(monthBarContainer, stats);

      // Відображення таблиці
      if (!monthTableBody) return;

      if (!Array.isArray(stats) || stats.length === 0) {
        monthTableBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-state">
              <div class="empty-state-title">Щомісячних даних не знайдено</div>
              <div>Додайте витрати для формування помісячного звіту</div>
            </td>
          </tr>
        `;
        return;
      }

      monthTableBody.innerHTML = "";
      stats.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(item.month)}</td>
          <td style="text-align: center; font-variant-numeric: tabular-nums;">${item.expenses_count}</td>
          <td class="col-amount">${formatMoney(item.total_amount)}</td>
        `;
        monthTableBody.appendChild(tr);
      });
    } catch (err) {
      if (monthTableBody) {
        monthTableBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-state" style="color: var(--color-danger);">
              <div class="empty-state-title">Помилка завантаження помісячної статистики</div>
              <div>${escapeHtml(err.message)}</div>
            </td>
          </tr>
        `;
      }
    }
  }

  // Паралельний запуск
  await Promise.all([
    loadSummary(),
    loadCategoryStats(),
    loadMonthStats()
  ]);
});
