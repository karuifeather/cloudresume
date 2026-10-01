# Role-adaptive Cloud Resume

Aashaya Aryal's resume at [resume.karuifeather.com](https://resume.karuifeather.com). Three targeted views share one validated career dataset: Software Engineering (default), Data / AI / ML, and Cybersecurity. Full Background exposes all active professional content.

## Frontend

The existing Vite static site uses TypeScript, semantic HTML, and plain CSS. No application framework, new backend, CMS, or database is needed. YAML is loaded and validated with Zod at build time; neither library is sent to the browser. The existing visitor-counter service remains optional and cannot block rendering.

```sh
cd frontend
corepack yarn@1.22.22 install --frozen-lockfile
yarn dev
```

Node 22+ is required; deployment CI uses Node 22. Yarn Classic is pinned in `package.json`, and CI installs from the existing lockfile with `--frozen-lockfile`.

```sh
yarn validate       # YAML schema and reference checks
yarn typecheck      # strict TypeScript
yarn test           # content discovery, targeting, validation, rendering
yarn build          # typecheck + validated Vite production build
yarn test:browser   # Chrome: URL state, keyboard/mobile behavior, PDFs
yarn format         # format frontend code, styles, and content with Prettier
yarn format:check   # check formatting without changing files
```

No lint configuration existed in this repository. Typechecking and automated tests cover the new frontend. Browser tests use Chrome at `/usr/bin/google-chrome` (override with `CHROME_PATH`) and Poppler's `pdfinfo` / `pdftotext`. Tests write screenshots and Letter PDFs into ignored `frontend/test-results/`.

## Content and architecture

- [`frontend/content/`](frontend/content/README.md): one YAML file per project, job, degree, certification, award, publication, and skill; profile facts and track presentation configurations.
- `frontend/src/content/schema.ts`: strict schemas; `frontend/scripts/load-content.ts`: automatic recursive discovery and reference validation.
- `frontend/vite.config.mts`: compiles content into a virtual module; malformed content fails builds, including archived records.
- `frontend/src/content/engine.ts`: deterministic ranking, visibility, variants, and print limits.
- `frontend/src/render.ts`: separate `WebResume` and `PrintResume` renderers.
- `frontend/src/main.ts`: query-string state, history, accessible role switching, metadata, and print preview.
- `frontend/src/styles.css` / `print.css`: responsive web styling and dedicated Letter print layout.

See the [content maintenance guide](frontend/content/README.md) for exact add/edit workflows and publication fields. No central import list needs updating.

## Sharing and printing

Share `/?role=software`, `/?role=data-ai`, or `/?role=cybersecurity`; `/?role=full` opens Full Background. Explicit URLs control the view, including refresh and browser history. No static-host routing rewrites are required.

“View print resume” opens the selected print layout. “Print / Save PDF” always prints the dedicated renderer. Software and Cybersecurity target one Letter page; Data/AI uses two. Chrome settings: Letter, 100% scale, headers/footers off. Recheck pagination after adding content; selection budgets live in track YAML.

Document titles, descriptions, Open Graph tags, and structured data update in the browser. Crawlers that do not execute JavaScript see default Software metadata; per-query server-rendered social previews are intentionally outside this static architecture.

## Deployment

The existing GitHub Actions frontend pipeline installs with Yarn, builds `frontend/dist`, syncs it to the existing S3 prefix, and invalidates CloudFront. Deployment destinations and AWS configuration remain unchanged. Build-time content validation and typechecking prevent invalid resumes from reaching the sync step.

The existing `backend/lambda_cloudresume/` Python visitor counter and `backend/terraform/` infrastructure are unchanged. Backend tests remain:

```sh
cd backend/lambda_cloudresume
poetry install
poetry run pytest tests/
```

No deployment is performed by local build/test commands.
