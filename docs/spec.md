# Technical Specification: SnipLi

## Overview

SnipLi is a Chrome extension (Manifest V3) that extracts structured job posting data from LinkedIn job pages and copies it to the clipboard as clean markdown. It operates with zero UI beyond the extension icon and an in-page toast notification. Built with plain JavaScript and bundled with Webpack.

## Technical Approach

### Architecture

The extension follows the standard Chrome MV3 architecture with three components:

- **Service worker (background):** Listens for icon clicks and keyboard shortcuts, manages extension icon enabled/disabled state based on the active tab URL, and sends messages to the content script to trigger extraction.
- **Content script:** Injected declaratively on LinkedIn job pages. Receives messages from the service worker, extracts job data from the DOM, writes markdown to the clipboard, and renders toast notifications.
- **No popup.** Clicking the extension icon directly triggers the extraction flow via a message to the content script.

Communication between the service worker and content script uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`.

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Platform | Chrome Extension (Manifest V3) | Required by PRD; current Chrome extension standard |
| Language | Plain JavaScript (ES2020+) | Required by PRD; no TypeScript or framework |
| Bundler | Webpack | Required by PRD; handles multiple entry points |
| Clipboard API | `navigator.clipboard.writeText()` | Modern async API; `clipboardWrite` permission covers the async message context |
| Navigation detection | `chrome.webNavigation` API | Reliable SPA navigation detection via `onHistoryStateUpdated` |

### Project Structure

```
snipli/
  src/
    background/
      service-worker.js      # Icon click handler, shortcut handler, tab/navigation listeners, icon state management
    content/
      content-script.js      # Message listener, orchestrates extraction and clipboard write
      extractor-search.js    # DOM extraction logic for job search results page
      extractor-job.js       # DOM extraction logic for standalone job page
      formatter.js           # Converts extracted data object to markdown string
      toast.js               # Injects and manages toast notification UI
      toast.css              # Toast notification styles
  icons/
    icon-16.png              # Toolbar icon
    icon-48.png              # Extensions page icon
    icon-128.png             # Chrome Web Store / install icon
  manifest.json              # Extension manifest (MV3)
  webpack.config.js          # Webpack configuration
  package.json               # Dependencies and scripts
```

- `src/background/` -- Service worker entry point. Runs in the extension's background context.
- `src/content/` -- All code that runs in the LinkedIn page context. Webpack bundles this into a single content script.
- `icons/` -- Extension icon assets in required sizes. SVG source files may be kept here for design purposes but only PNGs are copied to the build output. To be provided later; the extension is loadable without them (Chrome shows a default).
- Root config files handle build tooling and extension declaration.

## System Components

### Service Worker (`service-worker.js`)

- **Responsibility:** Coordinates the extension. Manages icon state, listens for user triggers (icon click and keyboard shortcut), and dispatches extraction requests to the content script.
- **Inputs:** `chrome.action.onClicked` events, `chrome.commands.onCommand` events, `chrome.tabs.onUpdated` events, `chrome.webNavigation.onHistoryStateUpdated` events.
- **Outputs:** Messages sent to the content script (`{ action: "extract" }`), `chrome.action.enable()` / `chrome.action.disable()` calls.
- **Key implementation details:**
  - On `chrome.action.onClicked`, sends an `"extract"` message to the active tab's content script.
  - On `chrome.commands.onCommand` for the registered shortcut, does the same.
  - On `chrome.tabs.onUpdated` (with `status: "complete"`) and `chrome.webNavigation.onHistoryStateUpdated`, checks if the tab URL matches the job page pattern and enables/disables the icon accordingly.
  - URL matching regex: `/^https:\/\/www\.linkedin\.com\/jobs\/(search-results|view)\//`
  - Disables the icon by default for all tabs using `chrome.action.disable()` at install time, then selectively enables it.

### Search Page Extractor (`extractor-search.js`)

- **Responsibility:** Extracts job data from the detail panel on LinkedIn job search results pages (`linkedin.com/jobs/search-results/...`).
- **Inputs:** The current page DOM.
- **Outputs:** A job data object (see Data Flow section).
- **Key implementation details:**
  - Exports a single function: `extractFromSearchPage() -> JobData | null`.
  - Targets the right-side detail panel that shows the currently selected job.
  - Uses CSS selectors and structural DOM traversal specific to the search results layout.
  - Returns `null` if the detail panel is not found or no job is selected.
  - Individual fields that are missing return `"Not listed"` as placeholder text.

### Job Page Extractor (`extractor-job.js`)

- **Responsibility:** Extracts job data from standalone LinkedIn job pages (`linkedin.com/jobs/view/...`).
- **Inputs:** The current page DOM.
- **Outputs:** A job data object.
- **Key implementation details:**
  - Exports a single function: `extractFromJobPage() -> JobData | null`.
  - Targets the main content area of the individual job view.
  - Uses CSS selectors and structural DOM traversal specific to the standalone job page layout.
  - Returns `null` if the expected job content structure is not found.
  - Individual fields that are missing return `"Not listed"` as placeholder text.

### Markdown Formatter (`formatter.js`)

- **Responsibility:** Converts a job data object into a markdown string.
- **Inputs:** A `JobData` object.
- **Outputs:** A markdown string.
- **Key implementation details:**
  - Exports a single function: `formatMarkdown(jobData) -> string`.
  - Output format:
    ```
    # {Job Title} @ {Company Name}
    - **Location:** {Location}
    - **Salary:** {Salary}
    - **URL:** {URL}

    ## Description
    {Full job description}
    ```
  - All fields are included regardless of whether they have real values or `"Not listed"`.

### Toast Notification (`toast.js` / `toast.css`)

- **Responsibility:** Displays a brief, auto-dismissing notification overlay on the LinkedIn page.
- **Inputs:** A message string and a type (`"success"` or `"error"`).
- **Outputs:** A DOM element injected into the page, removed after timeout.
- **Key implementation details:**
  - Exports a single function: `showToast(message, type)`.
  - Renders a fixed-position element in the top-right corner of the viewport.
  - Styling: dark semi-transparent background (`rgba(0, 0, 0, 0.8)`), white text, rounded corners, subtle fade-in/fade-out animation.
  - Auto-dismisses after 3 seconds.
  - No close button.
  - If a toast is already visible when a new one is triggered, the existing toast is replaced.
  - Styles are injected via `toast.css` bundled into the content script (Webpack CSS loader), or inlined, to avoid clashing with LinkedIn's styles. Uses a Shadow DOM host element to isolate styles.

### Content Script Orchestrator (`content-script.js`)

- **Responsibility:** Entry point for the content script. Listens for messages from the service worker and coordinates extraction, formatting, clipboard write, and toast display.
- **Inputs:** Messages from the service worker (`{ action: "extract" }`).
- **Outputs:** Clipboard content, toast notification.
- **Key implementation details:**
  - On receiving an `"extract"` message:
    1. Determines the page type from `window.location.href`.
    2. Calls the appropriate extractor (`extractFromSearchPage` or `extractFromJobPage`).
    3. If extraction returns `null`, shows an error toast: `"No job posting found on this page"`.
    4. Otherwise, passes the job data to `formatMarkdown()`.
    5. Writes the resulting string to the clipboard via `navigator.clipboard.writeText()`.
    6. Shows a success toast: `"Copied to clipboard!"`.
    7. If the clipboard write fails, shows an error toast: `"Failed to copy to clipboard"`.

## Data Flow

1. **User clicks the extension icon or presses the keyboard shortcut.**
2. **Service worker** receives the event via `chrome.action.onClicked` or `chrome.commands.onCommand`.
3. **Service worker** sends `{ action: "extract" }` message to the content script in the active tab via `chrome.tabs.sendMessage()`.
4. **Content script** receives the message and determines the page type from the current URL.
5. **Content script** calls the appropriate extractor function, which reads the DOM and returns a `JobData` object or `null`.
6. **Content script** passes the `JobData` object to the formatter, which returns a markdown string.
7. **Content script** writes the markdown string to the clipboard using `navigator.clipboard.writeText()`.
8. **Content script** injects a toast notification into the page confirming success or reporting an error.

### JobData Object Shape

```javascript
{
  title: string,       // "Senior Software Engineer" or "Not listed"
  company: string,     // "Acme Corp" or "Not listed"
  location: string,    // "San Francisco, CA (Remote)" or "Not listed"
  salary: string,      // "$120,000 - $160,000" or "Not listed"
  description: string, // Full description text or "Not listed"
  url: string          // Current page URL (always available)
}
```

## Key Technical Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Activation model | Direct action on icon click (no popup) | Popup with copy button; popup with preview | Single-click goal from PRD; fastest path; toast provides sufficient feedback |
| Toast placement | In-page overlay, top-right corner | Chrome notifications API; badge text on icon | Visible without leaving context; no extra permissions; auto-dismisses cleanly |
| Icon state | `chrome.action.disable()` / `enable()` | Swapping color/grey icon variants; always enabled with error on non-job pages | Built-in Chrome behavior handles greyed-out appearance; less code to maintain |
| SPA navigation detection | `chrome.webNavigation.onHistoryStateUpdated` | MutationObserver; polling `location.href` | Event-driven, reliable for `pushState`/`replaceState` navigation |
| Content script injection | Declarative via `manifest.json` `content_scripts` | Programmatic via `chrome.scripting.executeScript()` | Simpler; automatic on matching URLs; no orchestration code needed |
| Clipboard write | `navigator.clipboard.writeText()` with `clipboardWrite` permission | `document.execCommand('copy')`; offscreen document | Modern API; permission needed because user gesture doesn't propagate through async message |
| Extraction architecture | Two separate extraction functions (search page vs job page) | Single function with branching; config-driven selectors | LinkedIn uses different DOM structures for each page type; separation keeps each function focused and independently maintainable |
| Toast style isolation | Shadow DOM | Prefixed CSS classes; inline styles only | Prevents LinkedIn's styles from affecting the toast and vice versa |

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "SnipLi",
  "version": "1.0.0",
  "description": "Copy structured job posting data from LinkedIn as markdown.",
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "webNavigation"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://www.linkedin.com/jobs/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "copy-job": {
      "suggested_key": {
        "default": "Ctrl+Shift+L",
        "mac": "Command+Shift+L"
      },
      "description": "Copy job posting as markdown"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_title": "SnipLi - Copy job posting"
  }
}
```

## Webpack Configuration

- **Entry points:**
  - `background`: `src/background/service-worker.js` -> `dist/background.js`
  - `content`: `src/content/content-script.js` -> `dist/content.js`
- **Output:** `dist/` directory.
- **CSS handling:** `css-loader` and a method to inject styles into the Shadow DOM (either raw CSS string import or `style-loader` with custom insert function).
- **Mode:** `production` for build, `development` for watch.
- **Scripts:**
  - `npm run build` -- production build.
  - `npm run watch` -- development build with `--watch` flag.
- **Static files:** Use `copy-webpack-plugin` to copy `manifest.json` and `icons/` to `dist/`, keeping the build self-contained. The icons copy pattern must use a glob that only includes `.png` files (e.g., `icons/**/*.png`), excluding any `.svg` source files that may be present in the `icons/` directory.
- **No dev server, no hot reload.**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| User triggers extraction on a non-job page | Icon is disabled, so the click does nothing. If triggered via keyboard shortcut on a non-job page where the content script is not injected, the `sendMessage` call fails silently (no tab to receive). |
| Extractor finds no job content in the DOM | `extractFromSearchPage` / `extractFromJobPage` returns `null`. Toast displays: "No job posting found on this page" |
| Individual field missing from DOM | Field value set to `"Not listed"`. Extraction still succeeds for remaining fields. |
| `navigator.clipboard.writeText()` fails | Toast displays: "Failed to copy to clipboard" |
| Content script not yet loaded when message is sent | `chrome.tabs.sendMessage` returns an error. Service worker catches it and does nothing (race condition on very fast navigation; non-critical). |
| LinkedIn DOM structure changes (breaking change) | Extraction returns `null` or fields return `"Not listed"`. No crash. User sees error toast or degraded output. Selector updates required. |
| Multiple rapid clicks / shortcut presses | Each triggers independently. If a toast is already showing, it is replaced by the new one. |
| Keyboard shortcut triggered on non-LinkedIn tab | Content script is not present. `sendMessage` fails silently. No user-visible effect. |

## Constraints & Limitations

- DOM selectors for LinkedIn are reverse-engineered and will break when LinkedIn updates their markup. This is inherent to the approach and requires ongoing maintenance.
- Only works on `www.linkedin.com`. Does not support other LinkedIn domains (e.g., regional variants if they exist).
- Assumes the full job description is present in the DOM. If LinkedIn lazy-loads or truncates description text behind a "Show more" button that hasn't been clicked, the extracted description may be incomplete.
- No data persistence. Nothing is stored; each extraction is a one-shot clipboard write.
- v1 has a fixed markdown template. No user customization until v2.
- Icon assets are not yet available. The extension will use Chrome's default icon until custom icons are provided. Expected sizes: 16x16, 48x48, 128x128 PNG.

## Open Technical Questions

- What are the current CSS selectors and DOM structure for each field on LinkedIn's job search results page and standalone job page? Must be determined by inspecting the live site during implementation.
- Does LinkedIn's "Show more" button for job descriptions load additional content or just toggle CSS visibility? If it loads content, the extractor may need to simulate a click before reading the description.
- Are there additional LinkedIn URL patterns for job pages beyond `/jobs/search-results/` and `/jobs/view/` that should be supported (e.g., `/jobs/collections/`)?
