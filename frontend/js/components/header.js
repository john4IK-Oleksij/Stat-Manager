/**
 * Управління адаптивним Header та бургер-меню
 */
document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  const navBackdrop = document.getElementById("navBackdrop");

  function toggleMobileMenu(isOpen) {
    const willOpen = typeof isOpen === "boolean" ? isOpen : !burgerBtn.classList.contains("open");
    burgerBtn.classList.toggle("open", willOpen);
    mobileNav.classList.toggle("open", willOpen);
    navBackdrop.classList.toggle("open", willOpen);
    burgerBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    document.body.style.overflow = willOpen ? "hidden" : "";
  }

  if (burgerBtn && mobileNav && navBackdrop) {
    burgerBtn.addEventListener("click", () => toggleMobileMenu());
    navBackdrop.addEventListener("click", () => toggleMobileMenu(false));

    // Закриття по Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        toggleMobileMenu(false);
      }
    });

    // Закриття при кліку на посилання мобільного меню
    mobileNav.querySelectorAll(".mobile-nav-link").forEach((link) => {
      link.addEventListener("click", () => toggleMobileMenu(false));
    });
  }

  // Підсвічування активної сторінки в меню
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const allNavLinks = document.querySelectorAll(".nav-link, .mobile-nav-link");

  allNavLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Динамічне налаштування посилання на Swagger UI у футері відповідно до конфігурації API
  const apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "http://127.0.0.1:8000";
  const docsUrl = apiBase ? (apiBase.replace(/\/+$/, "") + "/docs") : "/docs";
  document.querySelectorAll('a[href*="/docs"]').forEach((link) => {
    link.href = docsUrl;
    link.title = `Відкрити Swagger UI (${docsUrl})`;
  });
});
