/**
 * Кастомні модальні вікна (без alert() та confirm())
 */
const Modal = {
  currentOnConfirm: null,
  currentOnCancel: null,

  init() {
    // Делегування закриття по Escape та backdrop
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });

    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          this.closeAll();
        }
      });
    });

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => this.closeAll());
    });

    const confirmBtn = document.getElementById("confirmModalOkBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (typeof this.currentOnConfirm === "function") {
          this.currentOnConfirm();
        }
        this.closeConfirm();
      });
    }

    const cancelBtn = document.getElementById("confirmModalCancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (typeof this.currentOnCancel === "function") {
          this.currentOnCancel();
        }
        this.closeConfirm();
      });
    }
  },

  showConfirm({
    title = "Підтвердження",
    message = "Видалити цю витрату? Цю дію не можна скасувати.",
    confirmText = "Видалити",
    cancelText = "Скасувати",
    onConfirm = null,
    onCancel = null
  }) {
    const modalEl = document.getElementById("confirmModal");
    if (!modalEl) return;

    this.currentOnConfirm = onConfirm;
    this.currentOnCancel = onCancel;

    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMessage");
    const okBtn = document.getElementById("confirmModalOkBtn");
    const cancelBtn = document.getElementById("confirmModalCancelBtn");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (okBtn) okBtn.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;

    modalEl.classList.add("open");
  },

  closeConfirm() {
    const modalEl = document.getElementById("confirmModal");
    if (modalEl) modalEl.classList.remove("open");
    this.currentOnConfirm = null;
    this.currentOnCancel = null;
  },

  showError({
    title = "Помилка",
    message = "Сталася неочікувана помилка. Спробуйте пізніше.",
    code = null
  }) {
    const modalEl = document.getElementById("errorModal");
    if (!modalEl) return;

    const titleEl = document.getElementById("errorModalTitle");
    const msgEl = document.getElementById("errorModalMessage");
    const codeEl = document.getElementById("errorModalCode");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    if (codeEl) {
      if (code) {
        codeEl.textContent = `Код: ${code}`;
        codeEl.style.display = "inline-block";
      } else {
        codeEl.style.display = "none";
      }
    }

    modalEl.classList.add("open");
  },

  closeError() {
    const modalEl = document.getElementById("errorModal");
    if (modalEl) modalEl.classList.remove("open");
  },

  closeAll() {
    document.querySelectorAll(".modal-backdrop").forEach((m) => {
      m.classList.remove("open");
    });
    this.currentOnConfirm = null;
    this.currentOnCancel = null;
  }
};

window.Modal = Modal;

document.addEventListener("DOMContentLoaded", () => {
  Modal.init();
});
