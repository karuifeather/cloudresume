const endpoint = "https://d2m530ny36pyb5.cloudfront.net/visitor";

type Stats = { visitor_count: number; countries?: string[] };
let stats: Stats | undefined;
let failed = false;
let request: Promise<void> | undefined;

export function renderVisitorStats() {
  const panel = document.querySelector("#visitor-stats");
  if (!panel) return;
  panel.replaceChildren();

  const total = document.createElement("div");
  total.className = "visitor-total";
  const count = document.createElement("strong");
  count.id = "visitor-count";
  count.textContent = stats ? stats.visitor_count.toLocaleString("en-US") : "—";
  const label = document.createElement("span");
  label.textContent = "visitors worldwide";
  total.append(count, label);
  panel.append(total);

  const detail = document.createElement("div");
  detail.className = "visitor-detail";
  if (!stats) {
    const caption = document.createElement("p");
    caption.textContent = failed
      ? "Visitor stats temporarily unavailable"
      : "Loading visitor stats…";
    detail.append(caption);
  }

  if (stats?.countries?.length) {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const countries = stats.countries
      .map((code) => ({
        code,
        name: names.of(code) || code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const list = document.createElement("ul");
    list.className = "visitor-countries";
    list.setAttribute("aria-label", "Countries visitors have viewed from");
    for (const { code, name } of countries) {
      const item = document.createElement("li");
      const flag = document.createElement("span");
      flag.setAttribute("aria-hidden", "true");
      flag.textContent = String.fromCodePoint(
        ...[...code].map((letter) => 127397 + letter.charCodeAt(0)),
      );
      item.append(flag, ` ${name}`);
      list.append(item);
    }
    detail.append(list);
    const note = document.createElement("small");
    note.className = "sr-only";
    note.textContent = "Countries recorded since country tracking began.";
    detail.append(note);
  }
  panel.append(detail);
}

export function loadVisitorStats(): Promise<void> {
  // Role changes reuse the result instead of registering additional visits.
  return (request ??= (async () => {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Visitor API unavailable");
      const data = await response.json();
      if (!Number.isSafeInteger(data.visitor_count) || data.visitor_count < 0) {
        throw new Error("Invalid visitor count");
      }
      stats = {
        visitor_count: data.visitor_count,
        countries: Array.isArray(data.countries)
          ? [
              ...new Set<string>(
                data.countries.filter(
                  (code: unknown) =>
                    typeof code === "string" &&
                    /^[A-Z]{2}$/.test(code) &&
                    code !== "XX" &&
                    code !== "ZZ",
                ),
              ),
            ]
          : undefined,
      };
    } catch {
      failed = true;
    }
    renderVisitorStats();
  })());
}
