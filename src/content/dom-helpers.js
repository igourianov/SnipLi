/**
 * Queries a single CSS selector against the root element and returns the
 * trimmed textContent of the first match.
 * @param {Element} root
 * @param {string} selector
 * @param {{ optional?: boolean, attr?: string }} [options]
 * @returns {string | null}
 */
export function query(root, selector, { optional = false, attr } = {}) {
  const el = root.querySelector(selector);
  if (!el && !optional) {
    throw new Error(`Element not found: ${selector}`);
  }
  const raw = attr ? el?.getAttribute(attr) : el?.textContent;
  return raw?.trim() || null;
}
