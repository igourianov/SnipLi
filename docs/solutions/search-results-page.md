# Search results page support

## Intent

LinkedIn has replaced the job search list page `/jobs/search/` with a new page at `/jobs/search-results/`. The new page shows the same job details but with entirely different markup, the same markup the single job view page `/jobs/view/` uses.

The user wants:
* Copy-as-markdown to work on `/jobs/search-results/` and on `/jobs/view/`, producing the same markdown as on the old page.
* Extraction on the old `/jobs/search/` page to keep working for now.
* On both new-markup pages, the job description and the company description show in full by default, without the "…more" truncation.
* On both new-markup pages, the "Your profile and resume are missing some required qualifications" block is hidden, along with the premium sections that `view.css` hides today.
* The view page CSS overrides to use the same stable selectors as the search results page, in one shared file.

## Constraints and assumptions

* Every class name in the new markup is a generated hash. Selectors never use class names.
* The only stable anchors in the job details markup are:
	* `id` and `componentkey` values shaped `JobDetails_{Section}_{jobId}`, `JobDetails{Section}Slot_{jobId}` and `JobMatchRef_{jobId}`, always matched by prefix since the job id varies, plus the fixed key `InitialStateHowYouFitSlot`.
	* `data-testid` values `expandable-text-box` and `expandable-text-button`.
	* `aria-label` on the top card company element: `Company, {name}`.
* The detail pane root is a `data-testid="lazy-column"` element with a random UUID `componentkey`. Neither extraction nor CSS uses it. `lazy-column` elements nest (on the search results page the detail pane sits inside another one), so a rule anchored on "a `lazy-column`'s child" can match an ancestor of the whole pane.
* Structural steps (parent, sibling, "next `p` in document order") are used only relative to a stable anchor and kept to one or two steps. No deep `nth-child` chains from `main`.
* The two pages differ in ways the solution absorbs without per-page logic:
	* On the view page the pane's first child is `JobDetails_ManageJobBanner_*`, so the top card is not the pane's first child. On both pages it is the section list's previous sibling.
	* The title is a link to `/jobs/view/{jobId}/` on the search results page and plain text on the view page.
	* The job type chips link to `/jobs/search-results/…` on the search results page and to `/jobs/view/{jobId}/…` on the view page.
	* The AI fit block at the top of the section list is keyed `InitialStateHowYouFitSlot` before the user runs the assessment ("Use AI to assess how you fit") and `JobMatchRef_{jobId}` after ("Your profile and resume are missing some required qualifications"). Either state can appear on either page.
* The full job description and company description text is present in the DOM. "…more" only clamps it with CSS, so expanding is done with CSS and needs no clicks.
* The "…more" button (`expandable-text-button`) sits inside the `expandable-text-box` element it expands.
* The "About the company" section (`JobDetails_AboutTheCompany_*`) is optional. Some jobs have none, and where it exists it renders lazily and is an empty placeholder `div` until then. Company data is extracted when the section is rendered and left empty otherwise. A copy taken before the section renders cannot be told apart from a job without one.
* Sample pages, in the user's Downloads folder:
	* `Director of Accounting _ Embrace Software Inc _ LinkedIn.html`: search results page, AI fit block assessed, company section not rendered.
	* `Tech Lead – Frontend Platform Team _ Xsolla _ LinkedIn.html`: view page, AI fit block not assessed, company section rendered.
	* The rendered company section was seen on the view page only. It is assumed identical on the search results page, since the section key and components are the same.
* Ruled out: hiding the "People you can reach out to" section (`JobDetailsPeopleWhoCanHelpSlot_*`) and the view page's `JobDetails_ManageJobBanner_*`. Not requested.
* Ruled out: waiting for or triggering the company section to render. A missing section is not an error.

## Scope

Owned:
* `src/content/content-script.js`: page dispatch, both extractors, the shared query helpers and `formatMarkdown`.
* `src/content/job-details.css`: CSS overrides for the new markup, shared by `/jobs/search-results/` and `/jobs/view/`.
* `src/content/view.css`: superseded. The view page's overrides come from `job-details.css` only.
* `src/manifest.json`: content script and CSS injection entries.
* `src/background/service-worker.js`: the job page URL pattern.
* `webpack.config.js`: only as far as `job-details.css` reaches `dist/content/` and `view.css` no longer does.

Context only, unchanged:
* The existing `/jobs/search/` extractor's selectors and `PAGE_CONFIG`, and `search.css`.
* `handleExtract` and the `JobData` shape.
* `toast.js`, `toast.css`.
* `README.md` and `docs/spec.md`.

## Solution

### Page dispatch (`content-script.js`)

`extractJobData` selects the extractor by `window.location.pathname`:
* A path starting with `/jobs/search-results/` or `/jobs/view/` goes to the job details extractor.
* A path starting with `/jobs/search/` goes to the existing extractor, driven by `PAGE_CONFIG` as it is now.
* Any other path fails with an "Unsupported page" error, which reaches the user as the existing error toast.

`/jobs/search/` does not match `/jobs/search-results/` because of the trailing slash, so the order of the checks does not matter.

Both extractors return the same `JobData` object: `jobTitle`, `companyName`, `location`, `jobDescription`, `companyDescription`, `tags`, `companyTags`, `url`. `handleExtract` and `formatMarkdown` do not know which page they are on.

The element lookup helpers (`query`, `queryText`) and `fail` are module-level functions that take the root element to search in. Both extractors use them. A required element that is missing fails with a message naming the selector or step, as it does now.

### Job details extractor (`content-script.js`)

One function serves both `/jobs/search-results/` and `/jobs/view/` with no per-page branches.

Elements, in the order they are resolved:
* **About the job section**: `[id^="JobDetails_AboutTheJob_"]` in the document. There is only one job details pane on the page. The rest of its `id` is the job id.
* **Section list**: the About the job section's parent. It holds the AI fit block, the people, job, premium, company and similar jobs sections.
* **Top card**: the section list's previous element sibling.
* **Company element**: `[aria-label^="Company, "]` in the top card.
* **Title paragraph**: the first `p` after the company element in document order, not counting the company element's own descendants. XPath's `following::p[1]` axis has exactly these semantics.
* **Metadata paragraph**: the first `p` after the title paragraph in document order. It reads e.g. `Canada · 1 hour ago · 2 people clicked apply`.
* **Chips row**: the metadata paragraph's parent's next element sibling.

Fields:
* `jobTitle`: the title paragraph's text. On the search results page the text is inside a link, on the view page it is direct text. The "Verified job" badge link in the same paragraph has no text.
* `url`: `https://www.linkedin.com/jobs/view/{jobId}/`, the same format the old page yields.
* `companyName`: the company element's text.
* `location`: the text of the metadata paragraph's first `span`, e.g. `Canada`, the same value the old page yields.
* `tags`: the non-empty texts of the `a[href*="/jobs/"]` links in the chips row, e.g. `Remote`, `Full-time`.
* `jobDescription`: the text of `[data-testid="expandable-text-box"]` inside the About the job section.
* `companyDescription`: the text of `[data-testid="expandable-text-box"]` inside `[id^="JobDetails_AboutTheCompany_"]`. Empty string when the section or its box is absent.
* `companyTags`: the description box's parent `p` has a previous sibling holding the row `Computer Games • 1001-5000 employees • 1,423 on LinkedIn`. `companyTags` is the texts of that row's child elements, dropping `•` separators and empty entries. Empty array when the description box is absent.

Every element except the company section's is required. Texts are read with `innerText` and trimmed, like the existing extractor. `innerText` of an `expandable-text-box` leaves out the "…more" button only because `job-details.css` hides it (see Tradeoffs).

### Markdown (`formatMarkdown`)

The output is the same as now, with two differences for empty data:
* The `Tags` line lists `tags` followed by `companyTags`, and is present when that combined list is non-empty.
* The `## Company Description` section is present only when `companyDescription` is non-empty.

### CSS overrides (`job-details.css`)

Injected on `/jobs/search-results/*` and `/jobs/view/*`. All rules are scoped under `main`. The section list is identified as the element with a direct child `[id^="JobDetails_AboutTheJob_"]`, the same anchor the extractor uses. Rules are never anchored on `lazy-column`, for the reason under Constraints.

Hidden (`display: none`):
* The AI fit block, in either state. Its key (`[componentkey^="JobMatchRef_"]` or `[componentkey="InitialStateHowYouFitSlot"]`) sits several wrapper `div`s deep, and its heading sits outside the keyed element. The rule hides the child of the section list that contains either key (via `:has()`), so neither the heading nor an empty card frame is left behind.
* Elements whose `componentkey` starts with `JobDetails_JobAlertToggle`, `JobDetails_ResumeReview`, `JobDetails_PremiumApplicantInsights`, `JobDetails_PremiumCompanyInsights` or `JobDetailsSimilarJobsSlot`. Each is a direct child of the section list, so the keyed element is the one hidden.

Expanded:
* `[data-testid="expandable-text-box"]` has no line clamp (`-webkit-line-clamp` and `line-clamp` set to `none`).
* `button[data-testid="expandable-text-button"]` is hidden.

These two rules cover both the job description and the company description, since both use the same component.

### Injection (`manifest.json`)

* The `content.js` entry matches `*://www.linkedin.com/jobs/search/*`, `*://www.linkedin.com/jobs/search-results/*` and `*://www.linkedin.com/jobs/view/*`.
* A CSS entry injects `content/job-details.css` on `*://www.linkedin.com/jobs/search-results/*` and `*://www.linkedin.com/jobs/view/*`.
* The `search.css` entry stays as it is.

### Icon state (`service-worker.js`)

`JOB_URL_PATTERN` matches `/jobs/search/`, `/jobs/search-results/` and `/jobs/view/`, the three pages with extraction.

## Tradeoffs

* **Separate extractor function over a selector config for the new markup.** The new markup needs steps a selector map can't express: parent and sibling steps from the About the job section, "next `p` in document order" for title and location, and the sibling step for company tags. The old page keeps its `PAGE_CONFIG` untouched, so dropping it later is a deletion of one function and one config. Cost: two extraction styles live side by side until then.
* **One extractor for both new-markup pages, anchored on what they share.** The top card is found through the section list rather than the pane, the title through the company element rather than a link, the URL through the section id rather than the title link and the chips through position rather than their link target. Cost: the rules depend on the two pages keeping the same top card arrangement. A layout change on one page breaks both.
* **Module-level query helpers over per-extractor closures.** This avoids duplicating the helpers across the two extractors. Cost: the old extractor's calls change form, a mechanical edit to code that otherwise stays as is.
* **Anchoring on stable attributes plus short structural steps.** It is the least fragile option available without class names. When a step breaks, the missing element fails loudly. Where a step can resolve to the wrong element instead of failing, the result is silent:
	* A job with no chips has the apply row as the metadata block's next sibling. Its "Apply" link is external, so `tags` comes out empty. An apply link into `/jobs/` (not seen in the samples) would show up as a tag.
* **Optional company section over failing.** Jobs without a company section still copy. Cost: a copy taken before the section renders silently lacks the company description and tags.
* **Extraction text depends on the CSS hiding "…more".** Reading `innerText` works cleanly only because `job-details.css` sets the button to `display: none`. Both are injected on the same URL matches, so they can't drift apart at runtime. The alternative, excluding the button in the extractor, duplicates what the CSS already does. Cost: removing the CSS rule would add "… more" to the copied text.
* **Hiding the AI fit block by its keys over hiding the section list's first child.** The old `view.css` hid it by position. If a job has no AI fit block, a position rule would hide whatever section comes first instead.
