/**
 * Компонент генерації SVG-діаграм без зовнішніх бібліотек
 * Відповідно до вимог FRONT_mission.md (розділ 4)
 */
const CHART_COLORS = [
  "#D97724", // Головний помаранчевий
  "#2563A6", // Контрастний синій
  "#E8B547", // Темно-жовтий
  "#2E7D32", // Зелений
  "#8E24AA", // Фіолетовий
  "#00897B", // Бірюзовий
  "#D81B60", // Малиновий
  "#FB8C00", // Світло-помаранчевий
  "#546E7A", // Сіро-синій
  "#3949AB", // Індиго
  "#7CB342", // Світло-зелений
  "#00ACC1"  // Морський
];

const Charts = {
  formatMoney(num) {
    const val = Number(num) || 0;
    return val.toLocaleString("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " ₴";
  },

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * 1. Кільцева SVG-діаграма витрат за категоріями (Donut Chart)
   */
  renderDonut(container, items) {
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Дані відсутні</div>
          <div>Категорії з витратами ще не зафіксовані</div>
        </div>
      `;
      return;
    }

    // Розрахунок загальної суми
    const validItems = items.filter((it) => (Number(it.total_amount) || 0) > 0);
    const total = validItems.reduce((acc, it) => acc + Number(it.total_amount || 0), 0);

    if (total <= 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Загальна сума витрат: 0.00 ₴</div>
          <div>Немає ненульових витрат для побудови часток</div>
        </div>
      `;
      return;
    }

    // Параметри кола (всі в PX)
    const size = 260;
    const center = size / 2;
    const radius = 80;
    const strokeWidth = 36;
    const circumference = 2 * Math.PI * radius; // ~502.65

    let currentOffset = 0;
    const slicesSvg = validItems.map((item, index) => {
      const amount = Number(item.total_amount) || 0;
      const percent = (amount / total) * 100;
      const dashLength = (percent / 100) * circumference;
      const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += dashLength;

      const color = CHART_COLORS[index % CHART_COLORS.length];
      const titleText = `${this.escapeHtml(item.name)}: ${this.formatMoney(amount)} (${percent.toFixed(1)}%)`;

      return `
        <circle
          class="donut-segment"
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="transparent"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          data-name="${this.escapeHtml(item.name)}"
          data-amount="${this.formatMoney(amount)}"
          data-percent="${percent.toFixed(1)}%"
          style="cursor: pointer; transition: stroke-width 0.15s ease;"
        >
          <title>${titleText}</title>
        </circle>
      `;
    }).join("");

    // Легенда поруч / внизу
    const legendHtml = validItems.map((item, index) => {
      const amount = Number(item.total_amount) || 0;
      const percent = ((amount / total) * 100).toFixed(1);
      const color = CHART_COLORS[index % CHART_COLORS.length];

      return `
        <div class="legend-item" title="${this.escapeHtml(item.name)}: ${this.formatMoney(amount)}">
          <span class="legend-color-dot" style="background-color: ${color};"></span>
          <span style="font-weight: 600;">${this.escapeHtml(item.name)}</span>
          <span style="color: var(--color-text-muted);">(${percent}%)</span>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="svg-chart-container" style="display: flex; flex-direction: column; align-items: center;">
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <svg class="svg-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform: rotate(-90deg);">
            <!-- Фонова сіра основа кільця -->
            <circle
              cx="${center}"
              cy="${center}"
              r="${radius}"
              fill="transparent"
              stroke="var(--color-border-subtle)"
              stroke-width="${strokeWidth}"
            />
            <!-- Сегменти діаграми -->
            ${slicesSvg}
          </svg>
          <!-- Текст у центрі кільця -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; padding: 20px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); font-weight: 700;">Всього</span>
            <span style="font-size: 18px; font-weight: 800; color: var(--color-text); line-height: 1.2;">${this.formatMoney(total)}</span>
          </div>
        </div>
        <div class="chart-legend" style="width: 100%;">
          ${legendHtml}
        </div>
      </div>
    `;

    // Інтерактивність: підсвічування сегмента при наведенні
    container.querySelectorAll(".donut-segment").forEach((seg) => {
      seg.addEventListener("mouseenter", () => {
        seg.setAttribute("stroke-width", String(strokeWidth + 4));
      });
      seg.addEventListener("mouseleave", () => {
        seg.setAttribute("stroke-width", String(strokeWidth));
      });
    });
  },

  /**
   * 2. Стовпчикова SVG-діаграма витрат за місяцями (Bar Chart)
   */
  renderBarChart(container, items) {
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Дані за місяцями відсутні</div>
          <div>Записи витрат ще не зафіксовані в базі</div>
        </div>
      `;
      return;
    }

    const maxAmount = Math.max(...items.map((it) => Number(it.total_amount) || 0), 1);

    // Геометрія SVG (в PX)
    const svgWidth = 500;
    const svgHeight = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const barCount = items.length;
    const slotWidth = chartWidth / barCount;
    const barWidth = Math.min(Math.max(slotWidth * 0.55, 14), 48);

    // Лінії горизонтальної сітки (0%, 50%, 100%)
    const gridLines = [0, 0.5, 1].map((ratio) => {
      const y = paddingTop + chartHeight * (1 - ratio);
      const val = maxAmount * ratio;
      return `
        <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="var(--color-border-subtle)" stroke-dasharray="3 3" />
        <text x="${paddingLeft - 6}" y="${y + 4}" font-size="10" fill="var(--color-text-muted)" text-anchor="end">${Math.round(val)}</text>
      `;
    }).join("");

    // Стовпчики
    const barsSvg = items.map((item, index) => {
      const amount = Number(item.total_amount) || 0;
      const count = Number(item.expenses_count) || 0;
      const barHeight = Math.max((amount / maxAmount) * chartHeight, 2);
      const x = paddingLeft + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = paddingTop + (chartHeight - barHeight);

      // Форматування місяця: "2026-10" -> "10.26"
      const monthParts = (item.month || "").split("-");
      const monthLabel = monthParts.length === 2 ? `${monthParts[1]}/${monthParts[0].slice(2)}` : item.month;
      const tooltipText = `${item.month}: ${this.formatMoney(amount)} (${count} ${count === 1 ? "витрата" : "витрат"})`;

      return `
        <g class="bar-group" tabindex="0">
          <title>${tooltipText}</title>
          <!-- Стовпчик із заокругленням верхніх кутів -->
          <rect
            x="${x}"
            y="${y}"
            width="${barWidth}"
            height="${barHeight}"
            rx="4"
            fill="var(--color-primary)"
            style="transition: fill 0.15s ease, opacity 0.15s ease; cursor: pointer;"
            class="chart-bar"
          />
          <!-- Підпис суми над стовпчиком (якщо вистачає ширини) -->
          <text
            x="${x + barWidth / 2}"
            y="${y - 6}"
            font-size="10"
            font-weight="700"
            fill="var(--color-text)"
            text-anchor="middle"
          >${Math.round(amount)}</text>
          <!-- Підпис місяця знизу -->
          <text
            x="${x + barWidth / 2}"
            y="${svgHeight - paddingBottom + 18}"
            font-size="11"
            fill="var(--color-text-muted)"
            font-weight="600"
            text-anchor="middle"
          >${this.escapeHtml(monthLabel)}</text>
        </g>
      `;
    }).join("");

    container.innerHTML = `
      <div class="svg-chart-container" style="max-width: 100%;">
        <svg class="svg-chart" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
          <!-- Сітка -->
          ${gridLines}
          <!-- Базова вісь X -->
          <line
            x1="${paddingLeft}"
            y1="${paddingTop + chartHeight}"
            x2="${svgWidth - paddingRight}"
            y2="${paddingTop + chartHeight}"
            stroke="var(--color-border)"
            stroke-width="1.5"
          />
          <!-- Стовпчики -->
          ${barsSvg}
        </svg>
      </div>
    `;

    // Інтерактивність: підсвічування кольором при наведенні
    container.querySelectorAll(".bar-group").forEach((grp) => {
      const rect = grp.querySelector(".chart-bar");
      if (rect) {
        grp.addEventListener("mouseenter", () => {
          rect.setAttribute("fill", "var(--color-primary-hover)");
        });
        grp.addEventListener("mouseleave", () => {
          rect.setAttribute("fill", "var(--color-primary)");
        });
      }
    });
  }
};

window.Charts = Charts;
