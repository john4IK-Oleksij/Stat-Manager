/**
 * Компонент генерації SVG-діаграм без зовнішніх бібліотек
 * Відповідно до вимог FRONT_mission.md (розділ 4)
 */
const CHART_COLORS = [
  "#0D7A53", // Смарагдовий зелений (основний)
  "#D97706", // Золотий / Янтарний (комплементарний контраст)
  "#2563EB", // Контрастний синій
  "#8E24AA", // Фіолетовий
  "#0D9488", // Бірюзовий
  "#EA580C", // Теплий корал
  "#0284C7", // Небесний
  "#4F46E5", // Індиго
  "#65A30D", // Лайм
  "#BE185D", // Рожевий
  "#059669", // Свіжа м'ята
  "#475569"  // Графітовий Slate
];

const Charts = {
  /**
   * Динамічний генератор кольорів:
   * Якщо категорій більше 12, генерує гармонійні відтінки за золотим кутом (137.5°).
   */
  getColor(index) {
    if (index < CHART_COLORS.length) {
      return CHART_COLORS[index];
    }
    const hue = Math.round((index * 137.5) % 360);
    return `hsl(${hue}, 65%, 45%)`;
  },

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
   * Підтримує перехід на сторінку витрат по кліку на сегмент чи легенду
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

    // Параметри кола (всі розміри в PX)
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

      const color = this.getColor(index);
      const titleText = `${this.escapeHtml(item.name)}: ${this.formatMoney(amount)} (${percent.toFixed(1)}%)\nКлікніть, щоб переглянути витрати цієї категорії`;

      return `
        <circle
          class="donut-segment"
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          data-id="${item.id}"
          data-name="${this.escapeHtml(item.name)}"
          style="cursor: pointer; pointer-events: stroke; transition: stroke-width 0.15s ease, opacity 0.15s ease;"
        >
          <title>${titleText}</title>
        </circle>
      `;
    }).join("");

    // Легенда
    const legendHtml = validItems.map((item, index) => {
      const amount = Number(item.total_amount) || 0;
      const percent = ((amount / total) * 100).toFixed(1);
      const color = this.getColor(index);

      return `
        <div
          class="legend-item donut-legend-clickable"
          data-id="${item.id}"
          title="Натисніть для фільтрації витрат за категорією «${this.escapeHtml(item.name)}»"
          style="cursor: pointer; padding: 3px 6px; border-radius: var(--radius-sm); transition: background-color var(--transition-fast);"
        >
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
              fill="none"
              stroke="var(--color-border-subtle)"
              stroke-width="${strokeWidth}"
              style="pointer-events: none;"
            />
            <!-- Сегменти діаграми -->
            ${slicesSvg}
          </svg>
          <!-- Текст у центрі кільця -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; padding: 20px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); font-weight: 600;">Всього</span>
            <span style="font-size: 18px; font-weight: 600; color: var(--color-text); line-height: 1.2;">${this.formatMoney(total)}</span>
          </div>
        </div>
        <div class="chart-legend" style="width: 100%;">
          ${legendHtml}
        </div>
      </div>
    `;

    // Інтерактивність: двостороннє підсвічування та клік-перехід до категорії
    container.querySelectorAll(".donut-segment").forEach((seg) => {
      const catId = seg.dataset.id;
      const legItem = container.querySelector(`.donut-legend-clickable[data-id="${catId}"]`);

      seg.addEventListener("mouseenter", () => {
        seg.setAttribute("stroke-width", String(strokeWidth + 5));
        if (legItem) {
          legItem.style.backgroundColor = "var(--color-secondary-light)";
        }
      });
      seg.addEventListener("mouseleave", () => {
        seg.setAttribute("stroke-width", String(strokeWidth));
        if (legItem) {
          legItem.style.backgroundColor = "transparent";
        }
      });
      seg.addEventListener("click", () => {
        if (catId) {
          window.location.href = `expenses.html?category_id=${catId}`;
        }
      });
    });

    container.querySelectorAll(".donut-legend-clickable").forEach((leg) => {
      const catId = leg.dataset.id;
      const segItem = container.querySelector(`.donut-segment[data-id="${catId}"]`);

      leg.addEventListener("mouseenter", () => {
        leg.style.backgroundColor = "var(--color-secondary-light)";
        if (segItem) {
          segItem.setAttribute("stroke-width", String(strokeWidth + 5));
        }
      });
      leg.addEventListener("mouseleave", () => {
        leg.style.backgroundColor = "transparent";
        if (segItem) {
          segItem.setAttribute("stroke-width", String(strokeWidth));
        }
      });
      leg.addEventListener("click", () => {
        if (catId) {
          window.location.href = `expenses.html?category_id=${catId}`;
        }
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

      // Форматування місяця: "2026-10" -> "10/26"
      const monthParts = (item.month || "").split("-");
      const monthLabel = monthParts.length === 2 ? `${monthParts[1]}/${monthParts[0].slice(2)}` : item.month;
      const tooltipText = `${item.month}: ${this.formatMoney(amount)} (${count} ${count === 1 ? "витрата" : "витрат"})\nКлікніть, щоб переглянути витрати за цей місяць`;

      return `
        <g
          class="bar-group"
          data-month="${this.escapeHtml(item.month)}"
          role="button"
          tabindex="0"
          aria-label="Місяць ${this.escapeHtml(item.month)}: ${this.formatMoney(amount)}"
          style="cursor: pointer; outline: none;"
        >
          <title>${tooltipText}</title>
          <!-- Прозора зона кліку (hitbox) для зручного натискання всієї колонки -->
          <rect
            x="${paddingLeft + index * slotWidth}"
            y="${paddingTop}"
            width="${slotWidth}"
            height="${chartHeight + 25}"
            fill="transparent"
            style="cursor: pointer;"
          />
          <rect
            x="${x}"
            y="${y}"
            width="${barWidth}"
            height="${barHeight}"
            rx="4"
            fill="var(--color-primary)"
            style="transition: fill 0.15s ease, opacity 0.15s ease; cursor: pointer; pointer-events: none;"
            class="chart-bar"
          />
          <text
            x="${x + barWidth / 2}"
            y="${y - 6}"
            font-size="10"
            font-weight="600"
            fill="var(--color-text)"
            text-anchor="middle"
            style="pointer-events: none;"
          >${Math.round(amount)}</text>
          <text
            x="${x + barWidth / 2}"
            y="${svgHeight - paddingBottom + 18}"
            font-size="11"
            fill="var(--color-text-muted)"
            font-weight="600"
            text-anchor="middle"
            style="pointer-events: none; transition: fill 0.15s ease;"
            class="bar-month-text"
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

    // Інтерактивність: підсвічування та перехід по кліку на сторінку витрат
    container.querySelectorAll(".bar-group").forEach((grp) => {
      const rect = grp.querySelector(".chart-bar");
      const label = grp.querySelector(".bar-month-text");
      const month = grp.dataset.month;

      grp.addEventListener("mouseenter", () => {
        if (rect) rect.setAttribute("fill", "var(--color-primary-hover)");
        if (label) {
          label.setAttribute("fill", "var(--color-primary)");
          label.setAttribute("font-weight", "bold");
        }
      });
      grp.addEventListener("mouseleave", () => {
        if (rect) rect.setAttribute("fill", "var(--color-primary)");
        if (label) {
          label.setAttribute("fill", "var(--color-text-muted)");
          label.setAttribute("font-weight", "600");
        }
      });
      grp.addEventListener("click", () => {
        if (month) {
          window.location.href = `expenses.html?month=${encodeURIComponent(month)}`;
        }
      });
      grp.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (month) {
            window.location.href = `expenses.html?month=${encodeURIComponent(month)}`;
          }
        }
      });
    });
  }
};

window.Charts = Charts;
