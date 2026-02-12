const JOB_URL_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(search|view)\//;

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

function triggerExtraction(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "extract" }).catch(() => {
    // Content script not loaded yet or tab not available -- ignore silently
  });
}

// Disable icon by default for all tabs
chrome.action.disable();

// Icon click -- trigger extraction
chrome.action.onClicked.addListener((tab) => {
  triggerExtraction(tab.id);
});

// Keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "copy-job") {
    triggerExtraction(tab.id);
  }
});

// Tab URL updates (full page loads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateIconState(tabId, tab.url);
  }
});

// SPA navigation (LinkedIn uses pushState)
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (details.frameId === 0) {
      updateIconState(details.tabId, details.url);
    }
  },
  { url: [{ hostEquals: "www.linkedin.com" }] }
);
