# SnipLi

A Chrome extension that extracts job posting data from LinkedIn and copies it to your clipboard as clean markdown. Tobe used with LLM m=parsing and/or personal job application trackers.

## What it does

Click the extension icon (or press `Ctrl+Shift+L` / `Cmd+Shift+L`) on any LinkedIn job page to copy structured job details -- title, company, location, description, and tags -- as markdown.

Works on both job search result pages and standalone job views (`/jobs/search/...` and `/jobs/view/...`).

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
    content-script.js    # Entry point, clipboard write, toast
    extractor.js         # DOM scraping for both page types
    formatter.js         # Job data to markdown conversion
    toast.js / toast.css # Toast notification (Shadow DOM)
  icons/                 # Extension icons
  manifest.json
```

## Permissions

- `activeTab`, `clipboardWrite`, `tabs`, `webNavigation`
- Only runs on `www.linkedin.com/jobs/*`
