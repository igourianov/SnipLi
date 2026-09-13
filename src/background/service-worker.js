const JOB_URL_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(search-results|view)\//;
const CONSOLE_PREFIX = "[SnipLi]";

function isJobPage(url) {
	return JOB_URL_PATTERN.test(url);
}

function updateIconState(tabId, url) {
	if (isJobPage(url)) {
		chrome.action.enable(tabId);
	} else {
		chrome.action.disable(tabId);
	}
}

// The content script runs on every LinkedIn page, and the shortcut fires even where the icon is disabled.
function triggerExtraction(tab) {
	if (!isJobPage(tab.url)) {
		return;
	}
	console.debug(CONSOLE_PREFIX, "extracting job from tab", tab.id);
	chrome.tabs.sendMessage(tab.id, { action: "extract" })
		.catch((err) => {
			console.error(CONSOLE_PREFIX, `extracting job from tab ${tab.id} failed`, err);
		});
}

chrome.action.disable();

chrome.action.onClicked.addListener(triggerExtraction);

chrome.commands.onCommand.addListener((command, tab) => {
	if (command === "copy-job") {
		triggerExtraction(tab);
	}
});

// Full page loads.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		updateIconState(tabId, tab.url);
	}
});

// LinkedIn navigates between views with pushState, without a page load.
chrome.webNavigation.onHistoryStateUpdated.addListener(
	(details) => {
		if (details.frameId === 0) {
			updateIconState(details.tabId, details.url);
		}
	},
	{ url: [{ hostEquals: "www.linkedin.com" }] }
);
