import cssText from "./toast.css";

const HOST_ID = "snipli-toast-host";
const DISPLAY_DURATION = 3000;
const FADE_OUT_DURATION = 300;

let currentTimeout = null;

function getOrCreateHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host.shadowRoot;

  host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  document.body.appendChild(host);
  return shadow;
}

/**
 * Shows a toast notification on the page.
 * @param {string} message
 * @param {"success" | "error"} type
 */
export function showToast(message, type) {
  const shadow = getOrCreateHost();

  // Remove any existing toast
  const existing = shadow.querySelector(".snipli-toast");
  if (existing) {
    existing.remove();
  }
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }

  const icon = type === "success" ? "\u2714" : "\u2716";

  const toast = document.createElement("div");
  toast.className = `snipli-toast snipli-toast--${type}`;

  const iconSpan = document.createElement("span");
  iconSpan.className = "snipli-toast__icon";
  iconSpan.textContent = icon;

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;

  toast.append(iconSpan, msgSpan);
  shadow.appendChild(toast);

  currentTimeout = setTimeout(() => {
    toast.classList.add("snipli-toast--fade-out");
    setTimeout(() => toast.remove(), FADE_OUT_DURATION);
  }, DISPLAY_DURATION);
}
