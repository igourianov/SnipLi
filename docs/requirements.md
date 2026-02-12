# Product Requirements Document: SnipLi

## Problem Statement

Job seekers who track applications in personal tools (spreadsheets, Notion, etc.) or use AI tools for resume tailoring and cover letter generation need structured job posting data from LinkedIn. Today this requires manual copy-pasting of individual fields across a cluttered page, which is tedious, error-prone, and breaks workflow momentum. SnipLi eliminates this friction by extracting job posting data from LinkedIn and placing clean, structured markdown into the clipboard with a single click or keystroke.

## Goals & Non-Goals

### Goals
- Let users copy structured job posting data from any LinkedIn job page in one action
- Output clean, consistent markdown suitable for both human reading and AI consumption
- Provide a frictionless experience with minimal UI and clear feedback
- Work reliably on LinkedIn's current job page layouts (search results and individual job pages)

### Non-Goals
- Customizable markdown templates (planned for v2)
- Storing or logging previously copied jobs
- Batch export of multiple job listings at once
- Support for browsers other than Chrome
- Scraping or interacting with LinkedIn's API
- Parsing non-job LinkedIn pages (profiles, company pages, etc.)
- Public Chrome Web Store release (v1 is personal use; public release is a future consideration)

## Target Users / Personas

### Active Job Seeker
- **Description:** A professional actively searching for roles on LinkedIn who maintains a personal job tracker and uses AI tools to tailor application materials.
- **Primary need:** Quickly capture structured job posting data without manual copy-pasting of individual fields.
- **Current workaround:** Manually copies title, company, description, and other fields one by one into a spreadsheet, Notion page, or AI chat prompt.

## Key Features

### P0 (Must Have)

#### LinkedIn Job Page Detection
- **User story:** As a job seeker, I want the extension to automatically detect when I'm on a LinkedIn job page so that I know when the copy feature is available.
- **Acceptance criteria:**
  - Extension icon/button is enabled when the active tab URL matches a LinkedIn job search page (`linkedin.com/jobs/search/...`) or individual job page (`linkedin.com/jobs/view/...`)
  - Extension icon/button is visually disabled/greyed out on all other pages
  - Detection updates when navigating between pages (including LinkedIn's SPA-style navigation)

#### Job Data Extraction
- **User story:** As a job seeker, I want the extension to parse key details from the currently displayed job posting so that I don't have to identify and copy each field manually.
- **Acceptance criteria:**
  - Extracts the following fields from the page DOM:
    - Job title
    - Company name
    - Location (including remote/hybrid/onsite designation and city)
    - Salary/compensation range
    - Full job description text
    - LinkedIn job URL
  - On job search pages, extracts data from the currently selected/previewed job in the detail panel
  - On individual job pages, extracts data from the main job content
  - Fields that are not present on the page are captured with a "Not listed" placeholder

#### Markdown Formatting & Clipboard Copy
- **User story:** As a job seeker, I want the extracted job data formatted as clean markdown and placed in my clipboard so that I can paste it directly into my tracker or AI tool.
- **Acceptance criteria:**
  - Output follows this format:
    ```
    # {Job Title} @ {Company Name}
    - **Location:** {Location}
    - **Salary:** {Salary}
    - **URL:** {URL}

    ## Description
    {Full job description}
    ```
  - Missing fields display placeholder text (e.g., `**Salary:** Not listed`)
  - Copied content is placed into the system clipboard
  - A brief auto-dismissing toast notification confirms successful copy ("Copied to clipboard!")

#### Error Handling
- **User story:** As a job seeker, I want clear feedback when something goes wrong so that I know the copy didn't succeed.
- **Acceptance criteria:**
  - If parsing fails (e.g., due to LinkedIn DOM changes), a toast notification displays: "No job posting found on this page"
  - Toast uses the same style and auto-dismiss behavior as the success notification
  - Extension does not crash or leave the user in an ambiguous state

### P1 (Should Have)

#### Keyboard Shortcut
- **User story:** As a job seeker, I want to trigger the copy with a keyboard shortcut so that I can capture jobs quickly without reaching for the extension icon.
- **Acceptance criteria:**
  - A default keyboard shortcut is registered (e.g., `Ctrl+Shift+L`)
  - Shortcut is rebindable through Chrome's built-in extension shortcut settings (`chrome://extensions/shortcuts`)
  - Shortcut triggers the same extraction, formatting, and clipboard copy flow as clicking the extension icon
  - If triggered on a non-job page, shows the same error toast as a failed parse

### P2 (Nice to Have)

#### Customizable Markdown Template (v2)
- **User story:** As a job seeker, I want to customize the markdown output format so that it matches my specific tracker or tool's expected structure.
- **Acceptance criteria:**
  - User can define a template with field placeholders
  - Template is persisted in extension storage
  - Default template matches the v1 format

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Extraction accuracy | All 6 fields correctly parsed on standard LinkedIn job pages | Manual testing across 20+ varied job postings |
| Page detection reliability | Zero false positives (enabled on non-job pages) or false negatives (disabled on job pages) | Manual testing across LinkedIn page types |
| Copy success rate | 100% of triggered copies result in valid clipboard content | Manual testing |
| Time to copy | Under 1 second from click/shortcut to clipboard + toast | Manual timing |

## Constraints & Assumptions

- **Chrome only** -- no cross-browser support in v1
- **Manifest V3** -- must use Chrome's current extension platform
- **Plain JavaScript** with Webpack bundler (no TypeScript, no framework)
- **DOM-dependent parsing** -- extraction relies on LinkedIn's current page structure; DOM changes may break parsing and will require maintenance
- **No LinkedIn API usage** -- all data is extracted from the rendered page DOM
- **Assumes full job description is present in the DOM** regardless of CSS visibility/truncation state
- **Personal use in v1** -- no analytics, onboarding, or store listing requirements

## Open Questions

- What are the exact CSS selectors / DOM paths for each field on LinkedIn's current job pages? (To be determined during implementation)
- How does LinkedIn's SPA navigation affect content script lifecycle and page detection? (To be investigated during implementation)
- Should the toast notification appear inside the page or as a browser-level notification?
