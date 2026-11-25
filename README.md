# Assay: website

The website for the supplement research platform. It is built with React,
TypeScript and Tailwind CSS (Vite), and every page is generated from data. There are no
hand-written supplement pages.

## How content gets onto the site

1. Each supplement has one research profile: `RESEARCH/profiles/<id>.json`
   (structure: `RESEARCH/profile-template.json`, rules: `RESEARCH/METHODOLOGY.md`).
2. `npm run data` reads every profile plus `DATABASE/catalog.json` and:
   - drops anything that breaks the rules (a source with no record of being read, a claim with
     no verified source, a source that failed the re-check in `RESEARCH/verification/recheck.json`),
   - writes `public/data.json` for the site,
   - writes the database tables in `DATABASE/` (JSON + CSV) and `DATABASE/build-report.txt`.
3. `npm run build` builds the site into `dist/`.

**To add a supplement:** write `RESEARCH/profiles/<new-id>.json`, run
`python3 RESEARCH/verification/recheck.py` (citation re-check), then `npm run data && npm run build`.
It appears in Explore, search, Myth vs. Science, Food vs. Supplements and the research library automatically.

**Review sign-off:** a new profile has `"review_status": "draft_ai"` and shows "Draft, pending review"
on the site. When a reviewer has checked every claim against its sources, set
`"review_status": "reviewed"`, `"reviewed_by": "<name>"` and `"reviewed_on": "YYYY-MM-DD"` in the profile.
The page label, footer and Method page update from the data.

## Publishing

The site is published with GitHub Pages. `.github/workflows/deploy.yml` builds and publishes it
whenever the `main` branch changes. `public/data.json` is committed, so after `npm run data`
commit the new `public/data.json` along with any code changes.

## Commands (run inside this WEBSITE folder)

    npm install         # once
    npm run data        # rebuild data from RESEARCH + DATABASE
    npm run dev         # local preview at http://localhost:5173
    npm run build       # production build in dist/
    npm run artifact    # package dist/ for the claude.ai preview link

## Where things live

- `src/lib/evidence.ts`: the evidence scale, verdicts and rating factors (mirrors METHODOLOGY.md)
- `src/lib/data.ts`: loading, indexing and search
- `src/components/`: reusable pieces (evidence rule, claim rows, food comparison, sources, layout, search)
- `src/pages/`: Home, Explore, Supplement profile, Claim, Myth vs. Science, Food vs. Supplements, Research, Method, Search
- `src/index.css`: design tokens (colours for light and dark), type and layout helpers

## Moving the site to another GitHub account

Nothing in the code names a GitHub account or web address (all paths are relative), so the
repository can be handed over as it is:

1. Repository **Settings → General → Danger Zone → Transfer ownership**, and enter the new owner's username.
2. The new owner accepts the transfer, then checks **Settings → Pages → Source** is still "GitHub Actions".
3. The web address changes to `<new-owner>.github.io/<repository-name>`; old links to the site address
   don't forward, so share the new one. A custom domain (optional) keeps the same address through a transfer.
