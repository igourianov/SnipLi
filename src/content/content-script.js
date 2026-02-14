import { showToast } from "./toast.js";

chrome.runtime.onMessage.addListener((message) => {
	if (message.action === "extract") {
		handleExtract();
	}
});

async function handleExtract() {
	let jobData;
	try {
		jobData = extractJobData();
	} catch (err) {
		console.error("[SnipLi] Failed to parse job posting:", err);
		showToast("Something went wrong while reading the job posting", "error");
		return;
	}

	const markdown = formatMarkdown(jobData);

	try {
		await navigator.clipboard.writeText(markdown);
		showToast("Copied to clipboard!", "success");
	} catch {
		showToast("Failed to copy to clipboard", "error");
	}
}

const PAGE_CONFIGS = [
	{
		match: /\/jobs\/search/,
		scope: "main .jobs-search__job-details--wrapper",
		getUrl: (scope) =>
			query(scope, ".job-details-jobs-unified-top-card__job-title a").href?.split("?")[0],
	},
	{
		match: /\/jobs\/view\//,
		scope: "main .jobs-details",
		getUrl: () => window.location.href.split("?")[0],
	},
];

function extractJobData() {
	const config = PAGE_CONFIGS.find((c) => c.match.test(window.location.pathname));
	if (!config) throw new Error(`Unsupported page: ${window.location.pathname}`);

	const scope = document.querySelector(config.scope);
	if (!scope) throw new Error(`Job details container not found: ${config.scope}`);

	const jobTitle = queryText(scope, ".job-details-jobs-unified-top-card__job-title");
	const companyName = queryText(scope, ".job-details-jobs-unified-top-card__company-name");
	const location = queryText(scope, ".job-details-jobs-unified-top-card__primary-description-container .tvm__text");
	const jobDescription = queryText(scope, "article.jobs-description__container");
	const companyDescription = queryText(scope, ".jobs-company__company-description");
	const tags = [...scope.querySelectorAll(".job-details-fit-level-preferences button .tvm__text")]
		.map(el => el.innerText?.trim())
		.filter(x => !!x);
	const url = config.getUrl(scope);

	return { jobTitle, companyName, location, jobDescription, companyDescription, url, tags };
}

function query(root, selector) {
	const el = root.querySelector(selector);
	if (!el) {
		throw new Error(`Element not found: ${selector}`);
	}
	return el;
}

function queryText(root, selector) {
	return query(root, selector).innerText?.trim() || "";
}

function formatMarkdown(jobData) {
	const lines = [`# ${jobData.jobTitle}`];
	lines.push(`- **Company:** ${jobData.companyName}`);
	lines.push(`- **Location:** ${jobData.location}`);
	lines.push(`- **URL:** ${jobData.url}`);

	if (jobData.tags.length > 0) {
		lines.push(`- **Tags:** ${jobData.tags.join(" | ")}`);
	}

	lines.push("", "## Job Description", jobData.jobDescription);
	lines.push("", "## Company Description", jobData.companyDescription);

	return lines.join("\n");
}
