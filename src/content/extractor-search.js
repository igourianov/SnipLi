import { query } from "./dom-helpers.js";

/**
 * Extracts job data from the detail panel on LinkedIn job search results pages.
 * @returns {import('./formatter').JobData | null}
 */
export function extractFromSearchPage() {
	const scope = document.querySelector("main .jobs-search__job-details--wrapper");
	if (!scope) return null;

	const jobTitle = query(scope, ".job-details-jobs-unified-top-card__job-title");
	const companyName = query(scope, ".job-details-jobs-unified-top-card__company-name");
	const jobDescription = query(scope, "article.jobs-description__container");
	const companyDescription = query(scope, ".jobs-company__company-description");
	const tags = [...scope.querySelectorAll(".job-details-fit-level-preferences button")].map(el => el.textContent.trim());
	const url = query(scope, ".job-details-jobs-unified-top-card__job-title a", { attr: "href" })?.split("?")[0];

	return { jobTitle, companyName, jobDescription, companyDescription, url, tags };
}
