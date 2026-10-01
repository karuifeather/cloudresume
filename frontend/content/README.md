# Maintaining the resume

Edit YAML here, then run `yarn validate`, `yarn test`, and `yarn build` from `frontend/`.
Every `.yaml` / `.yml` file is discovered recursively at build time. No imports or UI changes are needed. Development reloads when files are added, edited, or removed. YAML and Zod are build tools only; visitors receive compiled JSON.

## Shared rules

- One major item per file; use a unique lowercase, hyphenated `id` within each collection.
- Dates are quoted `"YYYY"` or `"YYYY-MM"`; employment end can be `present`. Publication/project years are integers.
- `active: true` is the default. Set `active: false` to archive a record everywhere, including Full Background.
- `tracks` contains any of `software`, `data-ai`, `cybersecurity`. A missing track means hidden in that targeted view.
- Each track entry requires `visibility: featured | normal | secondary | hidden`; `priority` is an integer, default 0.
- Experience is filtered by track visibility, then sorted by end date descending (Present first), start date descending, and ID for ties, before print limits are applied. This applies to web, print, and Full Background. Priority never reorders jobs; bullet selection and wording remain track-specific.
- For projects and other relevance-ranked sections, featured comes first, then normal, then secondary. Within each group: priority descending, date descending, ID ascending. Higher priority moves an item earlier.
- Targeted projects and skills show featured/normal records by default; `web.projectsMinVisibility` and `web.skillsMinVisibility` can include secondary records. Full Background includes them all. Experience and bullets also show secondary records on the web. Print uses the limits in `tracks/*.yaml`.
- Full Background shows all active records and canonical bullet wording, including track-hidden records. It never exposes archived records.
- URLs must be real HTTP(S) URLs. Omit unknown URLs, dates, credentials, or other optional fields. Never use invented placeholders in production content.
- Skills in project/experience `skills` and track `capabilities` are references to IDs in `skills/`. Unknown references fail validation.
- Unknown fields, duplicate IDs, malformed YAML, incorrect types, invalid dates/URLs, and invalid track names fail the build with the filename and field.

## Add a certification

Create `certifications/<id>.yaml`. Copy `certifications/aws-cloud-practitioner.yaml`, then replace `id`, `name`, `issuer`, and `date` with verified facts. Set `tracks` for each audience. Optional: `url`, `credentialId`, `active`, `priority` (Full Background ordering). All matching web and print views discover the file automatically.

## Add a project

Create `projects/<id>.yaml`; copy an existing project as the format reference. Required: `id`, `name`, `tracks`, and at least one `bullets` entry with `id` and `text`. Add `skills` as existing registry IDs. Optional: `subtitle`, `url`, integer `year`, `active`, `priority`. Set featured/normal priority high enough to enter a limited print selection if appropriate.

## Add an experience

Create `experience/<id>.yaml`; copy `experience/jsu-research-assistant.yaml`. Required: `id`, `name` (organization), `role`, `start`, `end`, `tracks`, and `bullets`. Optional: `location`, `skills`, `url`, `active`, `priority`. Use `end: present` for current employment. Keep one canonical job and vary individual accomplishments below it.

## Add a publication

Create `publications/<id>.yaml`. The directory is intentionally empty until there is a real publication. Required fields:

```yaml
id: replace-with-real-id
title: Replace with the real title
authors:
  - Replace with an actual author
year: 2026 # replace with the actual year
status: working-paper # working-paper | submitted | accepted | published
tracks:
  data-ai:
    visibility: featured
    priority: 100
```

Optional: `venue`, `summary`, `abstract`, `doi` (identifier beginning `10.`, not a URL), `paperUrl`, `codeUrl`, `topics` (array of strings), `active`, `priority`. This example is documentation only. Add verified metadata; do not imply acceptance with `status: published`. The publications section appears automatically on web and print when applicable records exist.

## Add an award or membership

Create `awards/<id>.yaml` with `id`, `name`, and `tracks`. Optional: `organization`, `dates` (array of quoted years/months), `kind: award | membership`, `url`, `active`, `priority`. Memberships are separate records. List every applicable year to avoid implying continuity where there was a gap.

## Add a skill

Create `skills/<id>.yaml` with `id`, `name`, `category`, and `tracks`. Copy a related skill to reuse a consistent category. Use that ID in project/experience `skills` arrays. Track visibility and priority control the grouped technical skills list; project technology lists reflect the project's canonical facts.

## Target individual bullets or change wording

Bullets with no `tracks` inherit normal visibility in all views where their parent appears. If a bullet has `tracks`, missing tracks are hidden. Each bullet may have `active: false`. Optional variants change wording without duplicating accomplishments:

```yaml
bullets:
  - id: benchmark-harness
    text: Built a version-controlled benchmark harness with network instrumentation.
    tracks:
      software:
        visibility: featured
        priority: 100
      data-ai:
        visibility: normal
        priority: 80
    variants:
      data-ai: Built reproducible network experiments with instrumented data collection.
```

Without a variant, canonical `text` is used. Full Background always uses canonical text. Keep variants factually equivalent.

## Presentation and print

`profile.yaml` holds contact facts and institution-level coursework. `tracks/*.yaml` holds audience-specific titles, summaries, three capabilities, and print budgets. The shared engine in `src/content/engine.ts` selects content for both renderers. Print configuration controls the summary, experience count, per-job bullet overrides (`experienceBulletLimits` keyed by job ID), project count, bullet counts, skill categories, and skills per category. All three tracks print three experiences, including Mein Bowl campus dining. Software prints three selected projects, Cybersecurity prints two, and Data/AI prints six projects on a dedicated second page. Mein Bowl uses one leadership bullet in Software print and two targeted bullets in Data/AI and Cybersecurity print; the older Upwork entry remains on the Software web view and Full Background. Other relevant projects remain on the web.

`?role=software`, `?role=data-ai`, `?role=cybersecurity`, and `?role=full` work with static hosting. Root defaults to software. `&view=print` opens a preview; Print / Save PDF uses the dedicated print renderer, even from the normal website.

Print in Chrome, US Letter, scale 100%, browser headers/footers off. Adding content can change pagination: run `yarn test:browser` after meaningful content changes, review its PDFs, and adjust selection budgets in track config. Print never truncates overflowing text. Full Background has no page budget.

### Explicit keyword emphasis

Bullet `text` and track-specific `variants` can wrap deliberately selected phrases in
`**double asterisks**`, for example `Built with **API Gateway** and **AWS Lambda**.`
Both web and PrintResume render these phrases as semantic `<strong>` elements.
This is a deliberately limited inline format, not Markdown or HTML: text is HTML
escaped first, and links, tags, and other Markdown are never interpreted. Unmatched
markers remain literal. Keep emphasis selective; never wrap an entire bullet.
Track variants own their emphasis just as they own their wording.

Targeted web views show the first three ranked accomplishments with an accessible
“Show N more” disclosure for the remainder. Full Background retains all
bullets. Print selection still comes exclusively from the existing track settings.
Print preview preserves Letter geometry (and can scroll horizontally on phones)
so its typesetting matches the PDF rather than reflowing into a mobile resume.

Software print skills use optional `print.skillGroups` entries with a `name` and
ordered canonical skill IDs. Labels and ordering belong to track YAML; names,
visibility, and active status still come from canonical skills. References are
validated. Tracks without these groups keep the existing category-based selection.
Project technologies use the existing skill visibility/priority ranking for the
selected track, showing up to eight inline names; Full Background shows all active
project technologies.

Each track defines `print.focusLine`, the specialization line beneath the name in
PrintResume. It replaces the plain print role title; the web hero still uses `title`.
Full Background retains its general title instead of inheriting a track focus.
