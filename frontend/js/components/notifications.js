/**
 * Система сповіщень: зелений badge у header
 */
const Notifications = {
  timeoutId: null,

  showSuccess(message, duration = 3500) {
    const badge = document.getElementById("headerSuccessBadge");
    const textEl = document.getElementById("headerSuccessText");

    if (!badge || !textEl) return;

    textEl.textContent = message;
    badge.classList.add("show");

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      badge.classList.remove("show");
    }, duration);
  },

  setFlashSuccess(message) {
    try {
      sessionStorage.setItem("expense_tracker_flash_success", message);
    } catch (e) {
      console.warn("Storage unavailable", e);
    }
  },

  checkFlash() {
    try {
      const flash = sessionStorage.getItem("expense_tracker_flash_success");
      if (flash) {
        sessionStorage.removeItem("expense_tracker_flash_success");
        setTimeout(() => {
          this.showSuccess(flash);
        }, 150);
      }
    } catch (e) {
      console.warn("Storage unavailable", e);
    }
  }
};

window.Notifications = Notifications;

document.addEventListener("DOMContentLoaded", () => {
  Notifications.checkFlash();
});
