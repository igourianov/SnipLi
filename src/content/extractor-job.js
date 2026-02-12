const NOT_LISTED = "Not listed";

/**
 * Extracts job data from standalone LinkedIn job pages (/jobs/view/...).
 * @returns {import('./formatter').JobData | null}
 */
export function extractFromJobPage() {
  const topCard =
    document.querySelector(".job-details-jobs-unified-top-card__container--two-pane") ||
    document.querySelector(".jobs-unified-top-card") ||
    document.querySelector(".job-view-layout");

  if (!topCard) return null;

  const title = extractTitle(topCard);
  const company = extractCompany(topCard);
  const location = extractLocation(topCard);
  const salary = extractSalary(topCard);
  const description = extractDescription();
  const url = window.location.href;

  return { title, company, location, salary, description, url };
}

function extractTitle(card) {
  const el =
    card.querySelector(".job-details-jobs-unified-top-card__job-title a") ||
    card.querySelector(".job-details-jobs-unified-top-card__job-title") ||
    card.querySelector(".jobs-unified-top-card__job-title a") ||
    card.querySelector(".jobs-unified-top-card__job-title") ||
    card.querySelector(".top-card-layout__title") ||
    document.querySelector("h1");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractCompany(card) {
  const el =
    card.querySelector(".job-details-jobs-unified-top-card__company-name a") ||
    card.querySelector(".job-details-jobs-unified-top-card__company-name") ||
    card.querySelector(".jobs-unified-top-card__company-name a") ||
    card.querySelector(".jobs-unified-top-card__company-name") ||
    card.querySelector(".top-card-layout__card a.topcard__org-name-link");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractLocation(card) {
  const el =
    card.querySelector(".job-details-jobs-unified-top-card__primary-description-container span") ||
    card.querySelector(".jobs-unified-top-card__bullet") ||
    card.querySelector(".top-card-layout__card .topcard__flavor--bullet");

  return el?.textContent?.trim() || NOT_LISTED;
}

function extractSalary(card) {
  const insights = card.querySelectorAll(
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
