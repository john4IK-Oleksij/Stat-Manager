/**
 * Індикатор стану бекенду (Health API Check)
 * Перевіряє endpoint GET /health та відображає стан у лівому нижньому кутку
 */
const ApiHealth = {
  checkInterval: null,
  isChecking: false,

  init() {
    this.createWidgetIfNotExists();
    this.checkHealth();

    // Періодична перевірка кожні 20 секунд
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, 20000);
  },

  createWidgetIfNotExists() {
    let widget = document.getElementById("apiHealthWidget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "apiHealthWidget";
      widget.className = "api-health-widget";
      widget.setAttribute("role", "status");
      widget.setAttribute("title", "Натисніть для оновлення статусу API");

      widget.innerHTML = `
        <span id="healthDot" class="health-status-dot checking"></span>
        <span id="healthText" class="health-status-text">API: Перевірка...</span>
        <span id="healthPing" class="health-status-ping"></span>
      `;

      widget.addEventListener("click", () => {
        if (!this.isChecking) {
          this.checkHealth();
        }
      });

      document.body.appendChild(widget);
    }
  },

  async checkHealth() {
    const dot = document.getElementById("healthDot");
    const text = document.getElementById("healthText");
    const pingEl = document.getElementById("healthPing");
    const widget = document.getElementById("apiHealthWidget");

    if (!dot || !text) return;

    this.isChecking = true;
    dot.className = "health-status-dot checking";
    text.textContent = "API: Перевірка...";
    if (pingEl) pingEl.textContent = "";

    const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "http://127.0.0.1:8000";
    const healthUrl = `${baseUrl.replace(/\/+$/, "")}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const startTime = performance.now();

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { "Accept": "application/json" }
      });
      clearTimeout(timeoutId);

      const endTime = performance.now();
      const pingMs = Math.round(endTime - startTime);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.status === "ok") {
          dot.className = "health-status-dot online";
          text.textContent = "API Online";
          if (pingEl) pingEl.textContent = `(${pingMs}ms)`;
          if (widget) widget.setAttribute("title", `API працює стабільно (${healthUrl})\nПінг: ${pingMs}ms\nНатисніть для оновлення`);
        } else {
          throw new Error("Невідомий статус");
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      dot.className = "health-status-dot offline";
      text.textContent = "API Offline";
      if (pingEl) pingEl.textContent = "";
      if (widget) {
        widget.setAttribute(
          "title",
          `Бекенд недоступний за адресою ${healthUrl}\nПеревірте, чи запущено uvicorn на порту 8000\nНатисніть для повторної спроби`
        );
      }
    } finally {
      this.isChecking = false;
    }
  }
};

window.ApiHealth = ApiHealth;

document.addEventListener("DOMContentLoaded", () => {
  ApiHealth.init();
});
