import { query } from "./dom-helpers.js";

/**
 * Extracts job data from standalone LinkedIn job pages (/jobs/view/...).
 * @returns {import('./formatter').JobData | null}
 */
export function extractFromJobPage() {
	const scope = document.querySelector("main .jobs-details");
	if (!scope) return null;

	const jobTitle = query(scope, ".job-details-jobs-unified-top-card__job-title");
	const companyName = query(scope, ".job-details-jobs-unified-top-card__company-name");
	const jobDescription = query(scope, "article.jobs-description__container");
	const companyDescription = query(scope, ".jobs-company__company-description");
	const tags = [...scope.querySelectorAll(".job-details-fit-level-preferences button")].map(el => el.textContent.trim());
	const url = window.location.href.split("?")[0];

	return { jobTitle, companyName, jobDescription, companyDescription, url, tags };
}
