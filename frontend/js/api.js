/**
 * Централізований клієнт для взаємодії з Expense Tracker API
 */
class ApiError extends Error {
  constructor(message, status = null, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const Api = {
  getBaseUrl() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "http://127.0.0.1:8000";
  },

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, "");
    const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const defaultHeaders = {
      "Accept": "application/json"
    };

    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      defaultHeaders["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      throw new ApiError(
        "Не вдалося з'єднатися з сервером API. Перевірте, чи запущено бекенд.",
        0,
        networkError
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      let errorMessage = "Сталася неочікувана помилка сервера";

      if (responseData && typeof responseData === "object" && responseData.detail) {
        if (typeof responseData.detail === "string") {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          // Pydantic 422 validation errors
          errorMessage = responseData.detail.map((err) => err.msg || "Некоректні дані").join("; ");
        }
      }

      // Зрозумілі локалізовані повідомлення для статусів
      if (response.status === 404) {
        errorMessage = responseData?.detail || "Запитуваний запис або ресурс не знайдено (404)";
      } else if (response.status === 409) {
        if (responseData?.detail === "Such record already exists") {
          errorMessage = "Такий запис вже існує (дублікат назви)";
        } else if (responseData?.detail === "Record is in use and cannot be deleted") {
          errorMessage = "Категорія містить пов'язані витрати і не може бути видалена";
        }
      } else if (response.status === 422) {
        errorMessage = `Помилка валідації: ${errorMessage}`;
      } else if (response.status === 503) {
        errorMessage = "Сервіс тимчасово зайнятий. Спробуйте повторити запит пізніше (503)";
      } else if (response.status >= 500) {
        errorMessage = "Внутрішня помилка сервера (500). Спробуйте пізніше.";
      }

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  },

  // ---------------- КАТЕГОРІЇ (/categories) ----------------
  async getCategories() {
    return await this.request("/categories/");
  },

  async getCategory(categoryId) {
    return await this.request(`/categories/${categoryId}`);
  },

  async createCategory(name) {
    const trimmed = (name || "").trim();
    return await this.request("/categories/", {
      method: "POST",
      body: { name: trimmed }
    });
  },

  async renameCategory(categoryId, name) {
    const trimmed = (name || "").trim();
    return await this.request(`/categories/${categoryId}`, {
      method: "PATCH",
      body: { name: trimmed }
    });
  },

  async deleteCategory(categoryId) {
    return await this.request(`/categories/${categoryId}`, {
      method: "DELETE"
    });
  },

  // ---------------- ВИТРАТИ (/expenses) ----------------
  async getExpenses(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category_id) query.set("category_id", params.category_id);
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.order) query.set("order", params.order);
    if (params.limit !== undefined) query.set("limit", params.limit);
    if (params.offset !== undefined) query.set("offset", params.offset);

    const queryString = query.toString();
    const endpoint = `/expenses/${queryString ? `?${queryString}` : ""}`;
    return await this.request(endpoint);
  },

  async getExpense(expenseId) {
    return await this.request(`/expenses/${expenseId}`);
  },

  async createExpense(payload) {
    return await this.request("/expenses/", {
      method: "POST",
      body: payload
    });
  },

  async updateExpense(expenseId, payload) {
    return await this.request(`/expenses/${expenseId}`, {
      method: "PATCH",
      body: payload
    });
  },

  async deleteExpense(expenseId) {
    return await this.request(`/expenses/${expenseId}`, {
      method: "DELETE"
    });
  },

  // ---------------- СТАТИСТИКА (/stats) ----------------
  async getStatsSummary() {
    return await this.request("/stats/summary");
  },

  async getStatsByCategory(minCount = 0) {
    return await this.request(`/stats/by-category?min_count=${minCount}`);
  },

  async getStatsByMonth() {
    return await this.request("/stats/by-month");
  }
};

window.Api = Api;
window.ApiError = ApiError;
