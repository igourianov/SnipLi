/**
 * Queries a single CSS selector against the root element and returns the
 * trimmed textContent of the first match.
 * @param {Element} root
 * @param {string} selector
 * @param {{ optional?: boolean, prop?: string }} [options]
 * @returns {string | null}
 */
export function query(root, selector, { optional = false, prop } = {}) {
  const el = root.querySelector(selector);
  if (!el && !optional) {
    throw new Error(`Element not found: ${selector}`);
  }
  if (!el)
	return null;
  return el[prop || "innerText"]?.trim() || null;
}
