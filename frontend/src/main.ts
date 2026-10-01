import content from "virtual:resume-content";
import { createResumeEngine, viewFromUrl } from "./content/engine";
import { WebResume, PrintResume } from "./render";
import "./styles.css";
import "./print.css";

const engine = createResumeEngine(content);

const web = document.querySelector<HTMLElement>("#web-resume")!;

const print = document.querySelector<HTMLElement>("#print-resume")!;

const toolbar = document.querySelector<HTMLElement>("#print-toolbar")!;

// The URL is the source of truth for both web and print layouts.
function render() {
  const url = new URL(location.href);
  const view = viewFromUrl(url);
  const resume = engine.getResume(view);

  web.innerHTML = WebResume(resume, content);
  print.innerHTML = PrintResume(engine.getResume(view, true), content);

  const preview = url.searchParams.get("view") === "print";

  document.body.classList.toggle("print-preview", preview);
  toolbar.hidden = !preview;
  document.querySelector<HTMLAnchorElement>("#back-to-resume")!.href =
    `?role=${view}`;

  // Update sharing metadata alongside the visible profile.
  document.title = `${content.profile.name} | ${resume.profile.title}`;

  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
  ]) {
    document
      .querySelector(selector)!
      .setAttribute(
        "content",
        resume.profile.summary ||
          "The complete professional background of Aashaya Aryal.",
      );
  }

  document
    .querySelector('meta[property="og:title"]')!
    .setAttribute("content", document.title);
  document
    .querySelector('meta[property="og:url"]')!
    .setAttribute("content", `${url.origin}${url.pathname}?role=${view}`);
  document.querySelector("#profile-data")!.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: content.profile.name,
    jobTitle: resume.profile.title,
    url: content.profile.website,
  });
  document.querySelector("#status")!.textContent =
    `${resume.profile.title} resume selected${preview ? ", print preview" : ""}.`;
}

// Rendering replaces controls, so restore focus after navigation.
function navigate(url: URL, focusRole?: string) {
  history.pushState({}, "", url);
  render();

  if (focusRole) {
    document
      .querySelector<HTMLButtonElement>(`[data-role="${focusRole}"]`)
      ?.focus();
  } else {
    window.scrollTo(0, 0);
    document
      .querySelector<HTMLElement>(
        document.body.classList.contains("print-preview")
          ? "#print-toolbar a"
          : ".role-title",
      )
      ?.focus();
  }
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.closest("[data-print]")) {
    window.print();

    return;
  }

  const role = target.closest<HTMLButtonElement>("[data-role]")?.dataset.role;

  if (role) {
    const url = new URL(location.href);

    url.searchParams.set("role", role);
    url.searchParams.delete("view");
    navigate(url, role);

    return;
  }

  const link = target.closest<HTMLAnchorElement>(
    "[data-preview], [data-background], #back-to-resume",
  );

  if (
    link &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  ) {
    event.preventDefault();
    navigate(new URL(link.href));
  }
});

// Arrow keys wrap through roles; Home and End jump to the edges.
document.addEventListener("keydown", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-role]",
  );

  if (
    !button ||
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  ) {
    return;
  }

  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-role]"),
  ];

  let next: number;

  if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = buttons.length - 1;
  } else {
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const current = buttons.indexOf(button);

    next = (current + direction + buttons.length) % buttons.length;
  }

  event.preventDefault();
  buttons[next].click();
});

window.addEventListener("popstate", render);

// Browser-initiated printing also needs the current role’s print selection.
window.addEventListener("beforeprint", () => {
  print.innerHTML = PrintResume(
    engine.getResume(viewFromUrl(new URL(location.href)), true),
    content,
  );
});

render();
