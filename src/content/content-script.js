import { showToast } from "./toast.js";

const CONSOLE_PREFIX = "[SnipLi]";

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
		console.error(CONSOLE_PREFIX, "Failed to parse job posting", err);
		showToast("Something went wrong while reading the job posting", "error");
		return;
	}

	const markdown = formatMarkdown(jobData);

	try {
		await navigator.clipboard.writeText(markdown);
		showToast("Copied to clipboard!", "success");
	} catch (err) {
		console.error(CONSOLE_PREFIX, "Failed to copy to clipboard", err);
		showToast("Failed to copy to clipboard", "error");
	}
}

const PAGE_CONFIG = {
	scope: "main .jobs-search__job-details--wrapper",
	selectors: {
		jobTitle: ".job-details-jobs-unified-top-card__job-title",
		companyName: ".job-details-jobs-unified-top-card__company-name",
		location: ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
		jobDescription: "article.jobs-description__container",
		companyDescription: ".jobs-company__company-description",
		tags: ".job-details-fit-level-preferences button .tvm__text",
		url: ".job-details-jobs-unified-top-card__job-title a",
	},
};

function extractJobData() {
	const scope = document.querySelector(PAGE_CONFIG.scope) ?? fail(`Job details container not found: ${PAGE_CONFIG.scope}`);

	const { selectors: sel } = PAGE_CONFIG;
	return {
		jobTitle: queryText(scope, sel.jobTitle),
		companyName: queryText(scope, sel.companyName),
		location: queryText(scope, sel.location),
		jobDescription: queryText(scope, sel.jobDescription),
		companyDescription: queryText(scope, sel.companyDescription),
		tags: [...scope.querySelectorAll(sel.tags)].map(el => el.innerText?.trim()).filter(x => !!x),
		url: query(scope, sel.url).href?.split("?")[0],
		companyTags: [...query(scope, sel.companyDescription).previousElementSibling.childNodes].map(x => (x.nodeValue || x.innerText || "").trim()).filter(x => !!x),
	};
}

function query(root, selector) {
	return root.querySelector(selector) ?? fail(`Element not found: ${selector}`);
}

function queryText(root, selector) {
	return query(root, selector).innerText?.trim() || "";
}

function fail(msg) {
	throw new Error(msg);
}

function formatMarkdown(jobData) {
	const lines = [`# ${jobData.jobTitle}`];
	lines.push(`- **Company:** ${jobData.companyName}`);
	lines.push(`- **Location:** ${jobData.location}`);
	lines.push(`- **URL:** ${jobData.url}`);

	if (jobData.tags.length > 0) {
		lines.push(`- **Tags:** ${[...jobData.tags, ...jobData.companyTags].join(" | ")}`);
	}

	lines.push("", "## Job Description", jobData.jobDescription);
	lines.push("", "## Company Description", jobData.companyDescription);

	return lines.join("\n");
}
