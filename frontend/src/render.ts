import type { Content } from "./content/schema";
import { rankItems, type Resume } from "./content/engine";

export const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// Short alias keeps escaped content readable inside HTML templates.
const e = escape;

export function date(value: string) {
  if (value === "present") {
    return "Present";
  }

  if (value.length === 4) {
    return value;
  }

  const [year, month] = value.split("-");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${months[Number(month) - 1]} ${year}`;
}

const range = (item: { start: string; end: string }) =>
  `${date(item.start)} – ${date(item.end)}`;

// Only explicit emphasis is interpreted; all content is escaped before markup is added.
export const emphasis = (value: string) =>
  e(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const list = (bullets: { text: string }[]) =>
  bullets.length
    ? /* HTML */ `<ul class="bullets">
        ${bullets.map((b) => /* HTML */ `<li>${emphasis(b.text)}</li>`).join("")}
      </ul>`
    : "";

// Mobile collapses extra bullets; print and Full Background show all of them.
function selectedBullets(
  bullets: { text: string }[],
  print: boolean,
  full: boolean,
) {
  if (print || full || bullets.length <= 3) {
    return list(bullets);
  }

  const items = bullets
    .map((bullet, index) => {
      const className = index >= 3 ? ' class="desktop-bullet"' : "";

      return `<li${className}>${emphasis(bullet.text)}</li>`;
    })
    .join("");

  return /* HTML */ `<ul class="bullets">
      ${items}
    </ul>
    <details class="more-details">
      <summary>Show ${bullets.length - 3} more</summary>
      ${list(bullets.slice(3))}
    </details>`;
}

function section(id: string, title: string, body: string, print = false) {
  return body
    ? /* HTML */ `<section
        class="resume-section ${id}"
        aria-labelledby="${print ? "print-" : ""}${id}"
      >
        <h2 id="${print ? "print-" : ""}${id}">${title}</h2>
        <div class="section-body">${body}</div>
      </section>`
    : "";
}

export function contact(person: Content["profile"]) {
  return /* HTML */ `<address>
    <span>${e(person.location)}</span
    ><a href="mailto:${e(person.email)}">${e(person.email)}</a
    ><a href="tel:${e(person.phone)}">${e(person.phone)}</a
    ><a href="${e(person.website)}">${e(new URL(person.website).hostname)}</a>
  </address>`;
}

function experience(resume: Resume, print: boolean) {
  return section(
    "experience",
    "Experience",
    resume.experience
      .map(
        (job) =>
          /* HTML */ `<article class="entry">
            <div class="entry-heading">
              <div>
                <h3>${e(job.role)}</h3>
                <p class="organization">
                  ${e(job.name)}${job.location ? ` <span>· ${e(job.location)}</span>` : ""}
                </p>
              </div>
              <p class="date">${e(range(job))}</p>
            </div>
            ${selectedBullets(job.bullets, print, resume.view === "full")}
          </article>`,
      )
      .join(""),
    print,
  );
}

function projectTechnologies(ids: string[], resume: Resume, content: Content) {
  const relevant = rankItems(
    content.skills.filter((skill) => ids.includes(skill.id)),
    resume.view,
  );

  const selected = resume.view === "full" ? relevant : relevant.slice(0, 8);

  return selected.length
    ? /* HTML */ `<p class="technologies">
        ${selected.map((skill) => e(skill.name)).join(" · ")}
      </p>`
    : "";
}

function projectTitle(project: Content["projects"][number]) {
  if (!project.url) {
    return e(project.name);
  }

  return /* HTML */ `<a href="${e(project.url)}"
    >${e(project.name)}<span class="external" aria-hidden="true"> ↗</span></a
  >`;
}

function projects(resume: Resume, content: Content, print: boolean) {
  return section(
    "projects",
    print
      ? "Selected projects"
      : resume.view === "full"
        ? "All projects"
        : "Selected work",
    resume.projects
      .map(
        (project) =>
          /* HTML */ `<article class="entry project">
            <div class="entry-heading">
              <div>
                <h3>${projectTitle(project)}</h3>
                ${project.subtitle ? /* HTML */ `<p class="subtitle">${e(project.subtitle)}</p>` : ""}
              </div>
              ${project.year ? /* HTML */ `<p class="date">${project.year}</p>` : ""}
            </div>
            ${selectedBullets(project.bullets, print, resume.view === "full")}
            ${print ? "" : projectTechnologies(project.skills, resume, content)}
          </article>`,
      )
      .join(""),
    print,
  );
}

function skillName(
  skill: Content["skills"][number],
  resume: Resume,
  print: boolean,
) {
  const featured =
    !print &&
    resume.view !== "full" &&
    skill.tracks[resume.view]?.visibility === "featured";

  return featured
    ? /* HTML */ `<strong>${e(skill.name)}</strong>`
    : e(skill.name);
}

function skills(resume: Resume, print: boolean) {
  return section(
    "skills",
    "Technical skills",
    /* HTML */ `<dl class="skill-groups">
      ${resume.skills
        .map(
          (group) =>
            /* HTML */ `<div>
              <dt>${e(group.category)}</dt>
              <dd>
                ${group.items.map((skill) => skillName(skill, resume, print)).join(" · ")}
              </dd>
            </div>`,
        )
        .join("")}
    </dl>`,
    print,
  );
}

function expectedGraduation(
  item: Content["education"][number],
  print: boolean,
) {
  if (!item.expected) {
    return "";
  }

  return print
    ? " (expected)"
    : /* HTML */ `<br /><span>Expected ${date(item.end)}</span>`;
}

function education(resume: Resume, print: boolean) {
  return section(
    "education",
    "Education",
    resume.education
      .map(
        (item) =>
          /* HTML */ `<article class="entry">
            <div class="entry-heading">
              <div>
                <h3>
                  ${e(item.name)}
                  <span class="gpa">GPA ${item.gpa.toFixed(1)}</span>
                </h3>
                <p class="organization">
                  ${e(item.institution)}${print ? "" : ` · ${e(item.location)}`}
                </p>
              </div>
              <p class="date">
                ${e(range(item))}${expectedGraduation(item, print)}
              </p>
            </div>
            ${list(item.bullets)}
          </article>`,
      )
      .join("") + list(resume.coursework),
    print,
  );
}

function awardLabel(item: Content["awards"][number]) {
  const organization = item.organization ? `, ${e(item.organization)}` : "";
  const dates = item.dates.length
    ? ` (${item.dates.map(date).join(", ")})`
    : "";

  return e(item.name) + organization + dates;
}

function credentials(resume: Resume, print: boolean) {
  const certs = resume.certifications
    .map(
      (item) =>
        /* HTML */ `<div class="credential">
          <h3>
            ${item.url ? /* HTML */ `<a href="${e(item.url)}">${e(item.name)}</a>` : e(item.name)}
          </h3>
          <p>
            ${e(item.issuer)} ·
            ${date(item.date)}${item.credentialId ? ` · ${e(item.credentialId)}` : ""}
          </p>
        </div>`,
    )
    .join("");

  const awards = resume.awards
    .map((item) => /* HTML */ `<span>${awardLabel(item)}</span>`)
    .join('<span class="separator">; </span>');

  return section(
    "credentials",
    "Certifications & recognition",
    certs + (awards ? /* HTML */ `<p class="recognition">${awards}</p>` : ""),
    print,
  );
}

function publicationDetails(
  item: Content["publications"][number],
  print: boolean,
) {
  const summary =
    item.summary || item.abstract
      ? /* HTML */ `<p>${e(item.summary ?? item.abstract)}</p>`
      : "";

  const doi = item.doi
    ? /* HTML */ `<a href="https://doi.org/${e(item.doi)}"
        >DOI: ${e(item.doi)}</a
      >`
    : "";

  const code = item.codeUrl ? ` <a href="${e(item.codeUrl)}">Code ↗</a>` : "";

  const topics =
    !print && item.topics.length
      ? /* HTML */ `<p class="technologies">
          ${item.topics.map(e).join(" · ")}
        </p>`
      : "";

  return summary + doi + code + topics;
}

function publications(resume: Resume, print: boolean) {
  return section(
    "publications",
    "Publications",
    resume.publications
      .map(
        (item) =>
          /* HTML */ `<article class="entry">
            <h3>
              ${item.paperUrl ? /* HTML */ `<a href="${e(item.paperUrl)}">${e(item.title)}</a>` : e(item.title)}
            </h3>
            <p>
              ${item.authors.map(e).join(", ")} ·
              ${item.year}${item.venue ? ` · ${e(item.venue)}` : ""} ·
              ${e(item.status.replace("-", " "))}
            </p>
            ${publicationDetails(item, print)}
          </article>`,
      )
      .join(""),
    print,
  );
}

export function WebResume(resume: Resume, content: Content) {
  const p = resume.profile;

  const summary =
    p.summary ||
    "Complete active experience, projects, skills, and recognition across all three disciplines.";

  const sections = [
    experience(resume, false),
    projects(resume, content, false),
    skills(resume, false),
    education(resume, false),
    credentials(resume, false),
    publications(resume, false),
  ].join("");

  return /* HTML */ `<header class="hero">
      <div class="eyebrow">
        ${resume.view === "full" ? "Professional history" : "Professional resume"}
      </div>
      <h1>${e(resume.person.name)}</h1>
      <p class="role-title" tabindex="-1">${e(p.title)}</p>
      <p class="headline">${e(p.headline)}</p>
      <div class="role-picker">
        <p id="role-label">View profile for</p>
        <div class="segmented" role="group" aria-labelledby="role-label">
          ${[...content.tracks]
            .sort(
              (a, b) =>
                ["software", "data-ai", "cybersecurity"].indexOf(a.id) -
                ["software", "data-ai", "cybersecurity"].indexOf(b.id),
            )
            .map(
              (t) =>
                /* HTML */ `<button
                  type="button"
                  data-role="${t.id}"
                  aria-pressed="${resume.view === t.id}"
                >
                  ${e(t.name)}
                </button>`,
            )
            .join("")}
        </div>
      </div>
      <p class="summary">${e(summary)}</p>
      <div class="hero-bottom">
        ${contact(resume.person)}
        <div class="actions">
          <a
            class="button primary"
            href="?role=${resume.view}&view=print"
            data-preview
            >Print Resume <span aria-hidden="true">↗</span></a
          ><a
            class="background-link"
            href="?role=${resume.view === "full" ? "software" : "full"}"
            data-background
            >${resume.view === "full" ? "Back to Software Engineering" : "Explore Full Background"}
            <span aria-hidden="true">→</span></a
          >
        </div>
      </div>
      ${
        p.capabilities.length
          ? /* HTML */ `<div class="capabilities">
              ${p.capabilities
                .map(
                  (c) =>
                    /* HTML */ `<div>
                      <h2>${e(c.name)}</h2>
                      <p>
                        ${c.skills.map((id) => e(content.skills.find((s) => s.id === id)!.name)).join(" · ")}
                      </p>
                    </div>`,
                )
                .join("")}
            </div>`
          : ""
      }
    </header>
    <main id="main-content" tabindex="-1">${sections}</main>
    <footer>
      <p>
        ${e(resume.person.name)} <span>· ${e(resume.person.location)}</span>
      </p>
      <a
        href="?role=${resume.view === "full" ? "software" : "full"}"
        data-background
        >${resume.view === "full" ? "Back to Software Engineering" : "Explore Full Background"}
        <span aria-hidden="true">→</span></a
      >
    </footer>`;
}

// Track settings determine whether projects start on a separate sheet.
export function PrintResume(resume: Resume, content: Content) {
  const split =
    resume.view !== "full" && resume.profile.print.projectsOnNewPage;

  const summaryText = resume.profile.print.summary ?? resume.profile.summary;

  const summary = resume.profile.summary
    ? /* HTML */ `<p class="print-summary">${e(summaryText)}</p>`
    : "";

  const header = /* HTML */ `<header class="print-header">
    <h1>${e(resume.person.name)}</h1>
    <p class="print-focus">
      ${e(resume.view === "full" ? resume.profile.title : resume.profile.print.focusLine)}
    </p>
    ${contact(resume.person)}${summary}
  </header>`;

  const background = `${skills(resume, true)}${education(resume, true)}${credentials(resume, true)}`;
  const projectSection = projects(resume, content, true);
  const publicationSection = publications(resume, true);

  const firstPage =
    header +
    experience(resume, true) +
    (split ? background : projectSection + background + publicationSection);

  const projectPage = split
    ? /* HTML */ `<div class="print-page print-project-page">
        <p class="continuation">
          ${e(resume.person.name)} · ${e(resume.profile.title)} · Selected work
        </p>
        ${projectSection}${publicationSection}
      </div>`
    : "";

  return /* HTML */ `<article
    class="print-resume"
    aria-label="${e(resume.profile.title)} print resume"
  >
    <div class="print-page">${firstPage}</div>
    ${projectPage}
  </article>`;
}
