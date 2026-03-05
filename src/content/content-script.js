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
	} catch (err) {
		console.error("[SnipLi] Failed to copy to clipboard:", err);
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
	const query = (selector) => scope.querySelector(selector) ?? fail(`Element not found: ${selector}`);
	const queryText = (selector) => query(selector).innerText?.trim() || "";

	const { selectors: sel } = PAGE_CONFIG;
	return {
		jobTitle: queryText(sel.jobTitle),
		companyName: queryText(sel.companyName),
		location: queryText(sel.location),
		jobDescription: queryText(sel.jobDescription),
		companyDescription: queryText(sel.companyDescription),
		tags: [...scope.querySelectorAll(sel.tags)].map(el => el.innerText?.trim()).filter(x => !!x),
		url: query(sel.url).href?.split("?")[0],
	};
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
		lines.push(`- **Tags:** ${jobData.tags.join(" | ")}`);
	}

	lines.push("", "## Job Description", jobData.jobDescription);
	lines.push("", "## Company Description", jobData.companyDescription);

	return lines.join("\n");
}
