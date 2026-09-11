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
	const path = window.location.pathname;
	if (path.startsWith("/jobs/search-results/") || path.startsWith("/jobs/view/")) {
		return extractFromJobDetails();
	}
	if (path.startsWith("/jobs/search/")) {
		return extractFromSearch();
	}
	fail(`Unsupported page: ${path}`);
}

function extractFromSearch() {
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

// Serves both /jobs/search-results/ and /jobs/view/, whose markup has only generated class names.
function extractFromJobDetails() {
	const aboutJobIdPrefix = "JobDetails_AboutTheJob_";
	const aboutJob = query(document, `[id^="${aboutJobIdPrefix}"]`);
	const sectionList = aboutJob.parentElement ?? fail("Section list not found: About the job section's parent");
	const topCard = sectionList.previousElementSibling ?? fail("Top card not found: section list's previous sibling");
	const company = query(topCard, '[aria-label^="Company, "]');
	const titleParagraph = queryFollowingParagraph(company, "company element");
	const metadataParagraph = queryFollowingParagraph(titleParagraph, "title paragraph");
	const chipsRow = metadataParagraph.parentElement.nextElementSibling ?? fail("Chips row not found: metadata paragraph parent's next sibling");
	// The company section is optional and renders lazily, so it is empty when absent or not rendered yet.
	const companyDescriptionBox = document.querySelector('[id^="JobDetails_AboutTheCompany_"] [data-testid="expandable-text-box"]');

	return {
		jobTitle: titleParagraph.innerText?.trim() || "",
		companyName: company.innerText?.trim() || "",
		location: queryText(metadataParagraph, "span"),
		jobDescription: queryText(aboutJob, '[data-testid="expandable-text-box"]'),
		companyDescription: companyDescriptionBox?.innerText?.trim() || "",
		tags: [...chipsRow.querySelectorAll('a[href*="/jobs/"]')].map(el => el.innerText?.trim()).filter(x => !!x),
		url: `https://www.linkedin.com/jobs/view/${aboutJob.id.slice(aboutJobIdPrefix.length)}/`,
		companyTags: [...(companyDescriptionBox?.parentElement.previousElementSibling?.children ?? [])].map(el => el.innerText?.trim()).filter(x => x && x !== "•"),
	};
}

// following::p[1] is the first p after the element in document order, skipping the element's own descendants.
function queryFollowingParagraph(el, description) {
	return document.evaluate("following::p[1]", el, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ?? fail(`Paragraph not found after ${description}`);
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

	const tags = [...jobData.tags, ...jobData.companyTags];
	if (tags.length > 0) {
		lines.push(`- **Tags:** ${tags.join(" | ")}`);
	}

	lines.push("", "## Job Description", jobData.jobDescription);

	if (jobData.companyDescription) {
		lines.push("", "## Company Description", jobData.companyDescription);
	}

	return lines.join("\n");
}
