# Search results page support

## Intent

LinkedIn has replaced the job search list page `/jobs/search/` with a new page at `/jobs/search-results/`. The new page shows the same job details but with entirely different markup, the same markup the single job view page `/jobs/view/` uses.

The user wants:
* Copy-as-markdown to work on `/jobs/search-results/` and on `/jobs/view/`, producing the same markdown as on the old page.
* Support for the old `/jobs/search/` page dropped, since LinkedIn no longer serves it.
* `README.md` to describe the supported pages and files.
* On both new-markup pages, the job description and the company description show in full by default, without the "…more" truncation.
* On both new-markup pages, the "Your profile and resume are missing some required qualifications" block is hidden, along with the premium sections that `view.css` hides today.
* On both new-markup pages, the "Interested in working with us in the future?" and "Company photos" blocks inside the About the company section are hidden.
* On both new-markup pages, the "People you can reach out to" heading is hidden. The section itself stays visible.
* On both new-markup pages, the top card's Save button is hidden, and the Apply button sits on the same line as the job type chips (Remote, Full-time, etc.), aligned to the right edge, instead of below them.
* The view page CSS overrides to use the same stable selectors as the search results page, in one shared file.

## Constraints and assumptions

* Every class name in the new markup is a generated hash. Selectors never use class names.
* The only stable anchors in the job details markup are:
	* `id` and `componentkey` values shaped `JobDetails_{Section}_{jobId}`, `JobDetails{Section}Slot_{jobId}` and `JobMatchRef_{jobId}`, always matched by prefix since the job id varies, plus the fixed key `InitialStateHowYouFitSlot`.
	* `data-testid` values `expandable-text-box`, `expandable-text-button` and `carousel-container`.
	* `aria-label` on the top card company element: `Company, {name}`.
	* `aria-label` on the top card Save button: `Save the job`. It is English UI text, and the label of an already saved job has not been seen.
* The detail pane root is a `data-testid="lazy-column"` element with a random UUID `componentkey`. Neither extraction nor CSS uses it. `lazy-column` elements nest (on the search results page the detail pane sits inside another one), so a rule anchored on "a `lazy-column`'s child" can match an ancestor of the whole pane.
* Structural steps (parent, sibling, "next `p` in document order") are used only relative to a stable anchor and kept to one or two steps. No deep `nth-child` chains from `main`.
* No CSS rule uses a `:has()` whose argument starts with a sibling combinator (`:has(+ …)` or `:has(~ …)`). Chrome does not reliably apply that shape on the live page, where LinkedIn keeps changing the DOM after load. It applies in a static render, yet on some live job pages it does not, and `querySelectorAll` never returns its matches. `:has()` with child or descendant arguments is reliable.
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
* Ruled out: hiding the whole "People you can reach out to" section (`JobDetailsPeopleWhoCanHelpSlot_*`), beyond its heading, and the view page's `JobDetails_ManageJobBanner_*`. Not requested.
* Ruled out: waiting for or triggering the company section to render. A missing section is not an error.
* Ruled out: splitting `content-script.js` into modules. It was deliberately consolidated into one file.
* Ruled out: injecting the page CSS from the content script. The manifest's declarative CSS applies before the page first renders, so hidden blocks never flash.
* Ruled out: changes to `toast.js` and `toast.css`. They are not part of this solution.

## Scope

Owned:
* `src/content/content-script.js`: `extractJobData`, its helpers and `formatMarkdown`.
* `src/content/job-details.css`: CSS overrides for the new markup, shared by `/jobs/search-results/` and `/jobs/view/`. It is the only page CSS file.
* `src/content/view.css` and `src/content/search.css`: retired. Page overrides come from `job-details.css` only.
* `src/manifest.json`: the `content_scripts` entries.
* `src/background/service-worker.js`: the job page URL pattern.
* `webpack.config.js`: the page CSS copy patterns.
* `README.md`.

Context only, unchanged:
* `handleExtract` and the `JobData` shape.
* `toast.js`, `toast.css`.
* `docs/spec.md`.

## Solution

### Content script (`content-script.js`)

The content script runs only on `/jobs/search-results/` and `/jobs/view/` (see Injection), so it has one extractor and no page check. `extractJobData` is the job details extractor below. It returns the `JobData` object that `handleExtract` and `formatMarkdown` consume: `jobTitle`, `companyName`, `location`, `jobDescription`, `companyDescription`, `tags`, `companyTags`, `url`.

LinkedIn navigates with `pushState`, so the script stays alive after the user leaves a job page in the same tab. Extraction triggered there (only through the keyboard shortcut, since the icon is disabled) fails on the missing About the job section and shows the usual error toast.

Helpers, all module-level:
* `query` and `queryText` take the root element to search in. A required element that is missing fails with a message naming the selector.
* One text helper returns an element's trimmed `innerText`, or an empty string for a missing element. `queryText` and every text read in the extractor go through it.
* `queryFollowingParagraph` resolves the `following::p[1]` step.
* `fail` throws with a message naming the missing selector or step.

### Job details extractor (`content-script.js`)

One function serves both pages with no per-page branches.

Elements, in the order they are resolved:
* **About the job section**: `[id^="JobDetails_AboutTheJob_"]` in the document. There is only one job details pane on the page. The rest of its `id` is the job id.
* **Section list**: the About the job section's parent, which always exists. It holds the AI fit block, the people, job, premium, company and similar jobs sections.
* **Top card**: the section list's previous element sibling.
* **Company element**: `[aria-label^="Company, "]` in the top card.
* **Title paragraph**: the first `p` after the company element in document order, not counting the company element's own descendants. XPath's `following::p[1]` axis has exactly these semantics.
* **Metadata paragraph**: the first `p` after the title paragraph in document order. It reads e.g. `Canada · 1 hour ago · 2 people clicked apply`.
* **Chips row**: the metadata paragraph's parent's next element sibling.

Fields:
* `jobTitle`: the title paragraph's text. On the search results page the text is inside a link, on the view page it is direct text. The "Verified job" badge link in the same paragraph has no text.
* `url`: `https://www.linkedin.com/jobs/view/{jobId}/`.
* `companyName`: the company element's text.
* `location`: the text of the metadata paragraph's first `span`, e.g. `Canada`.
* `tags`: the non-empty texts of the `a[href*="/jobs/"]` links in the chips row, e.g. `Remote`, `Full-time`.
* `jobDescription`: the text of `[data-testid="expandable-text-box"]` inside the About the job section.
* `companyDescription`: the text of `[data-testid="expandable-text-box"]` inside `[id^="JobDetails_AboutTheCompany_"]`. Empty string when the section or its box is absent.
* `companyTags`: the description box's parent `p` has a previous sibling holding the row `Computer Games • 1001-5000 employees • 1,423 on LinkedIn`. `companyTags` is the texts of that row's child elements, dropping `•` separators and empty entries. Empty array when the description box is absent.

Every element except the company section's is required. Texts are read through the text helper. `innerText` of an `expandable-text-box` leaves out the "…more" button only because `job-details.css` hides it (see Tradeoffs).

### Markdown (`formatMarkdown`)

The output is the title heading, the Company, Location, URL and Tags lines, and the Job Description and Company Description sections, with two rules for empty data:
* The `Tags` line lists `tags` followed by `companyTags`, and is present when that combined list is non-empty.
* The `## Company Description` section is present only when `companyDescription` is non-empty.

### CSS overrides (`job-details.css`)

Injected on `/jobs/search-results/*` and `/jobs/view/*`. All rules are scoped under `main`. The section list is identified as the element with a direct child `[id^="JobDetails_AboutTheJob_"]`, the same anchor the extractor uses. Rules are never anchored on `lazy-column`, for the reason under Constraints.

Hidden (`display: none`):
* The AI fit block, in either state. Its key (`[componentkey^="JobMatchRef_"]` or `[componentkey="InitialStateHowYouFitSlot"]`) sits several wrapper `div`s deep, and its heading sits outside the keyed element. The rule hides the child of the section list that contains either key (via `:has()`), so neither the heading nor an empty card frame is left behind.
* Elements whose `componentkey` starts with `JobDetails_JobAlertToggle`, `JobDetails_ResumeReview`, `JobDetails_PremiumApplicantInsights`, `JobDetails_PremiumCompanyInsights` or `JobDetailsSimilarJobsSlot`. Each is a direct child of the section list, so the keyed element is the one hidden.
* Inside `[id^="JobDetails_AboutTheCompany_"]`, two blocks whose only keys are random UUIDs, so each is anchored on a stable neighbor:
	* "Interested in working with us in the future?": the next element sibling of the company content block. The content block is the `div` holding the company link, the company tags row and the description paragraph, identified as the `div` with a direct child `p` containing the `expandable-text-box`.
	* "Company photos": the `div` that directly follows an `hr` and contains a `[data-testid="carousel-container"]`. The `hr` directly after it is hidden too, so the section doesn't show two separators in a row.
* The "People you can reach out to" heading: the `h2` inside `[componentkey^="JobDetailsPeopleWhoCanHelpSlot_"]`, the section's only heading. The section and its content ("Meet the hiring team" and the people cards) stay visible.

Top card layout:
* The top card's content is three sibling rows in one row container, in this order on both pages: the header block (company, title, metadata, "Promoted by hirer"), the chips row and the actions row (Apply, Save).
* The actions row is the row with two preceding siblings that contains `button[aria-label="Save the job"]`. The row container is its parent, i.e. the element with such a child (via `:has(> …)`). The header block is the row container's first child. Rows are identified by position relative to the actions row, since a rule anchored on "contains the company element" also matches every ancestor of the top card.
* The Save button's immediate wrapper is hidden, so no empty slot or gap is left next to Apply.
* The header block takes a full line. The chips row and the actions row share the next line, vertically centered with each other. The chips start at the left edge and the actions are aligned to the right edge, with free space between them. When the line has no room, the actions wrap below the chips.
* A job without chips has only the header block and the actions row, and keeps LinkedIn's own layout.

Expanded:
* `[data-testid="expandable-text-box"]` has no line clamp (`-webkit-line-clamp` and `line-clamp` set to `none`).
* `button[data-testid="expandable-text-button"]` is hidden.

These two rules cover both the job description and the company description, since both use the same component.

### Injection (`manifest.json`, `webpack.config.js`)

`content_scripts` has one entry matching `*://www.linkedin.com/jobs/search-results/*` and `*://www.linkedin.com/jobs/view/*`. It injects `content.js` and `content/job-details.css`. The build copies `job-details.css` to `dist/content/` as the only page CSS file.

### Icon state (`service-worker.js`)

`JOB_URL_PATTERN` matches `/jobs/search-results/` and `/jobs/view/`, the same pages the content script runs on.

### README (`README.md`)

Describes extraction on `/jobs/search-results/` and `/jobs/view/`, the CSS overrides on those pages, the project structure with `job-details.css` as the only page CSS file, and the content script matches.

## Tradeoffs

* **An extractor function over a selector config.** The new markup needs steps a selector map can't express: parent and sibling steps from the About the job section, "next `p` in document order" for title and location, and the sibling step for company tags. Cost: selectors and structural steps are spread through the function rather than listed in one place.
* **One extractor for both new-markup pages, anchored on what they share.** The top card is found through the section list rather than the pane, the title through the company element rather than a link, the URL through the section id rather than the title link and the chips through position rather than their link target. Cost: the rules depend on the two pages keeping the same top card arrangement. A layout change on one page breaks both.
* **Anchoring on stable attributes plus short structural steps.** It is the least fragile option available without class names. When a step breaks, the missing element fails loudly. Where a step can resolve to the wrong element instead of failing, the result is silent:
	* A job with no chips has the apply row as the metadata block's next sibling. Its "Apply" link is external, so `tags` comes out empty. An apply link into `/jobs/` (not seen in the samples) would show up as a tag.
* **Optional company section over failing.** Jobs without a company section still copy. Cost: a copy taken before the section renders silently lacks the company description and tags.
* **Extraction text depends on the CSS hiding "…more".** Reading `innerText` works cleanly only because `job-details.css` sets the button to `display: none`. Both are injected on the same URL matches, so they can't drift apart at runtime. The alternative, excluding the button in the extractor, duplicates what the CSS already does. Cost: removing the CSS rule would add "… more" to the copied text.
* **Anchoring the company section's "Interested" block on the description box.** It has no key of its own. Cost: for a company without a description, the rule has no anchor and the block stays visible.
* **Anchoring the top card layout on the Save button's label.** It is the only stable marker in the actions row. Cost: it is English-only, and if the label differs for an already saved job, that job's Save button stays visible and its rows keep LinkedIn's stacked layout.
* **Hiding the AI fit block by its keys over hiding the section list's first child.** The old `view.css` hid it by position. If a job has no AI fit block, a position rule would hide whatever section comes first instead.
