const NOT_LISTED = "Not listed";

/**
 * Extracts job data from the detail panel on LinkedIn job search results pages.
 * @returns {import('./formatter').JobData | null}
 */
export function extractFromSearchPage() {
  // The right-side detail panel for the selected job
  const panel =
    document.querySelector(".jobs-search__job-details--container") ||
    document.querySelector(".job-details-jobs-unified-top-card__container--two-pane");

  if (!panel) return null;

  const title = extractTitle(panel);
  const company = extractCompany(panel);
  const location = extractLocation(panel);
  const salary = extractSalary(panel);
  const description = extractDescription();
  const url = window.location.href;

  return { title, company, location, salary, description, url };
}

function extractTitle(panel) {
  const el =
    panel.querySelector(".job-details-jobs-unified-top-card__job-title a") ||
    panel.querySelector(".job-details-jobs-unified-top-card__job-title") ||
    panel.querySelector(".jobs-unified-top-card__job-title a") ||
    panel.querySelector(".jobs-unified-top-card__job-title") ||
    panel.querySelector("h1 a") ||
    panel.querySelector("h1");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractCompany(panel) {
  const el =
    panel.querySelector(".job-details-jobs-unified-top-card__company-name a") ||
    panel.querySelector(".job-details-jobs-unified-top-card__company-name") ||
    panel.querySelector(".jobs-unified-top-card__company-name a") ||
    panel.querySelector(".jobs-unified-top-card__company-name");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractLocation(panel) {
  const el =
    panel.querySelector(".job-details-jobs-unified-top-card__primary-description-container span") ||
    panel.querySelector(".jobs-unified-top-card__bullet");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractSalary(panel) {
  // Salary often appears in the job insight section
  const insights = panel.querySelectorAll(
    ".job-details-jobs-unified-top-card__job-insight span, .jobs-unified-top-card__job-insight span"
  );

  for (const el of insights) {
    const text = el.textContent?.trim();
    if (text && /[\$\€\£]|salary|compensation|\/yr|\/hr|per year|per hour/i.test(text)) {
      return text;
    }
  }

  return NOT_LISTED;
}

function extractDescription() {
  // Try to expand "Show more" if present
  const showMoreBtn = document.querySelector(
    ".jobs-description__footer-button, button[aria-label='Show more']"
  );
  if (showMoreBtn) {
    showMoreBtn.click();
  }

  const descEl =
    document.querySelector(".jobs-description__content .jobs-box__html-content") ||
    document.querySelector(".jobs-description-content__text") ||
    document.querySelector(".jobs-description__content") ||
    document.querySelector("#job-details");

  return descEl?.innerText?.trim() || NOT_LISTED;
}
