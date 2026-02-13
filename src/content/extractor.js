
const PAGE_CONFIGS = [
	{
		match: /\/jobs\/search/,
		scope: "main .jobs-search__job-details--wrapper",
		getUrl: (scope) =>
			query(scope, ".job-details-jobs-unified-top-card__job-title a", { prop: "href" })?.split("?")[0],
	},
	{
		match: /\/jobs\/view\//,
		scope: "main .jobs-details",
		getUrl: () => window.location.href.split("?")[0],
	},
];

/**
 * Extracts job data from the current LinkedIn page.
 * @returns {import('./formatter').JobData | null}
 */
export function extractJobData() {
	const config = PAGE_CONFIGS.find((c) => c.match.test(window.location.pathname));
	if (!config) return null;

	const scope = document.querySelector(config.scope);
	if (!scope) return null;

	const jobTitle = query(scope, ".job-details-jobs-unified-top-card__job-title");
	const companyName = query(scope, ".job-details-jobs-unified-top-card__company-name");
	const jobDescription = query(scope, "article.jobs-description__container");
	const companyDescription = query(scope, ".jobs-company__company-description");
	const tags = [...scope.querySelectorAll(".job-details-fit-level-preferences button .tvm__text")].map(el => el.innerText?.trim());
	const url = config.getUrl(scope);

	return { jobTitle, companyName, jobDescription, companyDescription, url, tags };
}


function query(root, selector, { optional = false, prop } = {}) {
	const el = root.querySelector(selector);
	if (!el && !optional) {
		throw new Error(`Element not found: ${selector}`);
	}
	if (!el) return null;
	return el[prop || "innerText"]?.trim() || null;
}
