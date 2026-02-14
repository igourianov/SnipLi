import { extractJobData } from "./extractor.js";
import { formatMarkdown } from "./formatter.js";
import { showToast } from "./toast.js";

async function handleExtract() {
	let jobData;
	try {
		jobData = extractJobData();
	} catch (err) {
		console.error("[SnipLi] Failed to parse job posting:", err);
		showToast("Something went wrong while reading the job posting", "error");
		return;
	}

	if (!jobData) {
		showToast("No job posting found on this page", "error");
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

chrome.runtime.onMessage.addListener((message) => {
	if (message.action === "extract") {
		handleExtract();
	}
});
