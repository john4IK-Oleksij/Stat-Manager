/**
 * Логіка головної сторінки «Огляд витрат» (index.html)
 */
document.addEventListener("DOMContentLoaded", async () => {
  const kpiTotal = document.getElementById("kpiTotalAmount");
  const kpiCount = document.getElementById("kpiExpensesCount");
  const kpiAvg = document.getElementById("kpiAvgAmount");
  const kpiMinMax = document.getElementById("kpiMinMaxAmount");

  const donutContainer = document.getElementById("donutChartContainer");
  const barContainer = document.getElementById("barChartContainer");
  const recentTableBody = document.getElementById("recentExpensesTableBody");

  let categoriesMap = new Map();

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
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  }

  // 1. Завантаження категорій для співставлення назв
  async function loadCategories() {
    try {
      const categories = await Api.getCategories();
      if (Array.isArray(categories)) {
        categories.forEach((cat) => categoriesMap.set(cat.id, cat.name));
      }
    } catch (e) {
      console.warn("Категорії недоступні:", e);
    }
  }

  // 2. Завантаження загальної статистики (KPI)
  async function loadSummary() {
    try {
      const summary = await Api.getStatsSummary();
      if (summary) {
        if (kpiTotal) kpiTotal.textContent = formatMoney(summary.total_amount);
        if (kpiCount) kpiCount.textContent = summary.expenses_count ?? 0;
        if (kpiAvg) kpiAvg.textContent = formatMoney(summary.avg_amount || 0);
        if (kpiMinMax) {
          const min = summary.min_amount !== null ? Math.round(summary.min_amount) : 0;
          const max = summary.max_amount !== null ? Math.round(summary.max_amount) : 0;
          kpiMinMax.textContent = `${min} / ${max} ₴`;
        }
      }
    } catch (err) {
      console.warn("Помилка завантаження summary:", err);
      if (kpiTotal) kpiTotal.textContent = "—";
      if (kpiCount) kpiCount.textContent = "—";
      if (kpiAvg) kpiAvg.textContent = "—";
      if (kpiMinMax) kpiMinMax.textContent = "—";
    }
  }

  // 3. Завантаження графіків
  async function loadCharts() {
    // Графік категорій
    try {
      const catStats = await Api.getStatsByCategory(0);
      Charts.renderDonut(donutContainer, catStats);
    } catch (err) {
      if (donutContainer) {
        donutContainer.innerHTML = `
          <div class="empty-state" style="color: var(--color-danger);">
            <div class="empty-state-title">Не вдалося завантажити діаграму</div>
            <div>${escapeHtml(err.message)}</div>
          </div>
        `;
      }
    }

    // Графік щомісячних витрат
    try {
      const monthStats = await Api.getStatsByMonth();
      Charts.renderBarChart(barContainer, monthStats);
    } catch (err) {
      if (barContainer) {
        barContainer.innerHTML = `
          <div class="empty-state" style="color: var(--color-danger);">
            <div class="empty-state-title">Не вдалося завантажити графік</div>
            <div>${escapeHtml(err.message)}</div>
          </div>
        `;
      }
    }
  }

  // 4. Завантаження останніх 5 витрат
  async function loadRecentExpenses() {
    if (!recentTableBody) return;

    try {
      const expenses = await Api.getExpenses({
        limit: 5,
        sort_by: "spent_on",
        order: "desc"
      });

      if (!Array.isArray(expenses) || expenses.length === 0) {
        recentTableBody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <div class="empty-state-title">Список останніх витрат порожній</div>
              <div>Ви ще не створили жодної витрати</div>
            </td>
          </tr>
        `;
        return;
      }

      recentTableBody.innerHTML = "";
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
        `;

        recentTableBody.appendChild(tr);
      });
    } catch (err) {
      recentTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state" style="color: var(--color-danger);">
            <div class="empty-state-title">Помилка завантаження останніх витрат</div>
            <div>${escapeHtml(err.message)}</div>
          </td>
        </tr>
      `;
    }
  }

  // Запуск завантаження
  await loadCategories();
  await Promise.all([
    loadSummary(),
    loadCharts(),
    loadRecentExpenses()
  ]);
});
