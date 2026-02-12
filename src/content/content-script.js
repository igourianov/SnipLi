import { extractFromSearchPage } from "./extractor-search.js";
import { extractFromJobPage } from "./extractor-job.js";
import { formatMarkdown } from "./formatter.js";
import { showToast } from "./toast.js";

function isSearchPage() {
  return /\/jobs\/search/.test(window.location.pathname);
}

function isJobViewPage() {
  return /\/jobs\/view\//.test(window.location.pathname);
}

async function handleExtract() {
  let jobData = null;

  if (isSearchPage()) {
    jobData = extractFromSearchPage();
  } else if (isJobViewPage()) {
    jobData = extractFromJobPage();
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
