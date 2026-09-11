# SnipLi

A Chrome extension that extracts job posting data from LinkedIn and copies it to your clipboard as clean markdown. To be used with LLM parsing and/or personal job application trackers.

## What it does

Click the extension icon (or press `Ctrl+Shift+L` / `Cmd+Shift+L`) on a LinkedIn job page to copy structured job details as markdown: title, company, location, URL, job description, company description and tags.

Works on `/jobs/search-results/` pages (the job selected in the search results list) and `/jobs/view/` pages (a single job). Both share the same job details markup.

Also injects CSS overrides on those pages:
- Hides the AI fit block, the premium sections and similar jobs.
- Hides the "Interested in working with us in the future?" and "Company photos" blocks in the About the company section.
- Shows the job description and company description in full, without the "…more" truncation.
- Hides the Save button and puts the Apply button on the same line as the job type chips, aligned to the right.

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
    job-details.css      # CSS overrides for /jobs/search-results/ and /jobs/view/ pages
  icons/                 # Extension icons
  manifest.json
```

## Permissions

- `activeTab`, `clipboardWrite`, `tabs`, `webNavigation`
- Content script and CSS inject on `www.linkedin.com/jobs/search-results/*` and `www.linkedin.com/jobs/view/*`
