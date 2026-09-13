# In-app navigation to job pages

## Intent

LinkedIn sometimes moves between views without loading a new document. When the user reaches `/jobs/search-results/` or `/jobs/view/` this way from another LinkedIn page, the CSS overrides are not applied and copy-as-markdown does nothing until the page is refreshed.

The user wants:
* The CSS overrides and copy-as-markdown to work on job pages reached by in-app navigation, without a refresh.
* The CSS overrides to have no effect on LinkedIn content outside job details, including pages the user navigates to after leaving a job page.
* The copy shortcut to do nothing on pages that are not job pages, instead of attempting an extraction that fails with an error toast.

## Constraints and assumptions

* Manifest `content_scripts` are injected only when a document loads, and only if its URL matches at that moment. A `pushState` navigation injects nothing, and a script or stylesheet already injected stays in the document after the URL changes.
* LinkedIn changes the URL with `pushState`. The service worker already tracks it through `webNavigation.onHistoryStateUpdated` for the icon state, and `tab.url` reflects the pushed URL.
* `chrome.commands` fires the shortcut on every tab, whether the action icon is enabled or not.
* What the CSS rules hide, expand and lay out, and the anchors they may use, are specified in `docs/solutions/search-results-page.md`. This doc adds only where the rules may match.* Some anchors those rules use also exist outside job details: the `expandable-text-box` and `expandable-text-button` components and the `Save the job` button label. Unverified where exactly they appear (the feed and job cards in lists are likely), but the solution does not depend on it.
* Assumed, unverified: `JobDetails_AboutTheJob_*` appears only inside a job details pane, never in a job card, a list or a feed item.
* Assumed, unverified: evaluating the `:has()` rules of `job-details.css` on every LinkedIn page, including the feed, has no noticeable rendering cost.
* Ruled out: injecting the script and CSS from the service worker with `chrome.scripting` on navigation into job URLs and removing the CSS on navigation out. It needs the `scripting` permission, add/remove tracking per tab, a guard against injecting the script twice, and can briefly show the page without overrides after navigation.

## Scope

Owned:
* `src/manifest.json`: the `content_scripts` matches.
* `src/content/job-details.css`: the scoping of every rule to the job details pane.
* `src/background/service-worker.js`: `triggerExtraction`.
* `README.md`: the description of where the content script and CSS are injected.

Context only, unchanged:
* `content-script.js`: `handleExtract`, `extractJobData` and `formatMarkdown`.
* The effect of each rule in `job-details.css`, as specified in `docs/solutions/search-results-page.md`.
* The icon state in `service-worker.js`: `JOB_URL_PATTERN`, `updateIconState` and its listeners.

## Solution

### Injection (`manifest.json`)

The single `content_scripts` entry matches `*://www.linkedin.com/*`. Every LinkedIn document gets `content.js` and `content/job-details.css` when it loads, so both are present whichever view the user navigates to within the tab. The content script only registers its message listener at load, so it does nothing on pages where no extraction is requested.

### CSS scoping (`job-details.css`)

Every rule matches only inside the job details pane. The pane is identified through the About the job section (`[id^="JobDetails_AboutTheJob_"]`), the same anchor the extractor uses:
* The section list is the About the job section's parent.
* The pane is the section list's parent, which also holds the top card.

Rules already anchored on a `JobDetails*` key keep that anchor. Rules anchored on something that also exists outside job details (the expandable text component, the Save button label) are limited to the pane: the expandable text rules to the section list and the top card rules to the pane. No rule uses a `:has()` whose argument starts with a sibling combinator.

When the user leaves a job page by in-app navigation, the stylesheet stays in the document but matches nothing, since no job details pane is rendered.

### Extraction trigger (`service-worker.js`)

`triggerExtraction` sends the `extract` message only when the tab's URL is a job page by `isJobPage`, the same check that enables the icon. On any other page the icon is disabled and the shortcut does nothing: no message, no toast. On a job page, extraction and its error toast behave as before.

### README (`README.md`)

The Permissions section states that the content script and CSS inject on all `www.linkedin.com` pages, that the CSS affects only the job details pane and that copying works on `/jobs/search-results/` and `/jobs/view/`.

## Tradeoffs

* **Injecting on all of LinkedIn over injecting on navigation.** Declarative, no new permissions, no add/remove tracking, and the overrides are in place before the pane renders. Cost: the stylesheet is evaluated on every LinkedIn page, and a rule that loses its pane scoping silently changes unrelated LinkedIn pages.
* **Scoping CSS by markup over by URL.** The pane anchor is present exactly when there is something to override, with no knowledge of URLs in the CSS. Cost: a job details pane rendered on a URL other than the two job pages gets the overrides too, while copying there stays disabled.
* **Guarding extraction by URL in the service worker over by markup in the content script.** It reuses `isJobPage`, so the shortcut and the icon agree on where copying works. Cost: a job page whose pane is not rendered yet still shows the error toast.
