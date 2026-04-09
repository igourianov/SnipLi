# SnipLi

A Chrome extension that extracts job posting data from LinkedIn and copies it to your clipboard as clean markdown. To be used with LLM parsing and/or personal job application trackers.

## What it does

Click the extension icon (or press `Ctrl+Shift+L` / `Cmd+Shift+L`) on any LinkedIn job search page to copy structured job details as markdown: title, company, location, URL, job description, company description and tags.

Works on `/jobs/search/` pages. Also injects CSS fixes on `/jobs/view/` pages, but extraction is not supported there as standalone job views use entirely different markup.

## Build & Install

```bash
npm install
npm run build
```

Then load the `dist/` folder as an unpacked extension in `chrome://extensions/` (Developer mode).

For development with auto-rebuild:

```bash
npm run watch
```

## Project Structure

```
src/
  background/
    service-worker.js    # Icon state management, message routing
  content/
    content-script.js    # Entry point, extraction, formatting, clipboard write
    toast.js / toast.css # Toast notification (Shadow DOM)
    view.css             # CSS fixes for /jobs/view/ pages
    search.css           # CSS fixes for /jobs/search/ pages
  icons/                 # Extension icons
  manifest.json
```

## Permissions

- `activeTab`, `clipboardWrite`, `tabs`, `webNavigation`
- Content script runs on `www.linkedin.com/jobs/search/*`; CSS also injects on `www.linkedin.com/jobs/view/*`
