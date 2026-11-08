// Глобальна конфігурація фронтенду
const isLocalStatic = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  && window.location.port !== "8000";

window.APP_CONFIG = {
  API_BASE_URL: isLocalStatic ? "http://127.0.0.1:8000" : window.location.origin,
  DEFAULT_LIMIT: 20,
};
