import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test.beforeEach(async ({ page }) => {
  await page.route("https://d2m530ny36pyb5.cloudfront.net/visitor", (route) =>
    route.fulfill({ json: { visitor_count: 134, countries: ["US", "NP"] } }),
  );
});

test("root, URL changes, keyboard switching, refresh and history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".role-title")).toHaveText("Software Engineer");

  const software = page.getByRole("button", {
    name: "Software Engineering",
    exact: true,
  });

  await software.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/role=data-ai/);
  await expect(page.locator(".role-title")).toHaveText(
    "Data Science & ML Engineer",
  );
  await expect(
    page.getByRole("button", { name: "Data / AI / ML", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator(".role-title")).toHaveText(
    "Data Science & ML Engineer",
  );
  await page
    .getByRole("button", { name: "Cybersecurity", exact: true })
    .click();
  await expect(page.locator(".role-title")).toHaveText(
    "Cybersecurity Engineer",
  );
  await page.goBack();
  await expect(page.locator(".role-title")).toHaveText(
    "Data Science & ML Engineer",
  );
  await page
    .getByRole("link", { name: "Explore Full Background" })
    .first()
    .click();
  await expect(page.locator("#web-resume .project")).toHaveCount(10);
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
});

for (const [role, title, pages] of [
  ["software", "Software Engineer", 1],
  ["data-ai", "Data Science & ML Engineer", 2],
  ["cybersecurity", "Cybersecurity Engineer", 1],
] as const) {
  test(`${role}: direct link, responsive selector and clean ${pages}-page PDF`, async ({
    page,
  }, info) => {
    const errors: string[] = [];

    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/?role=${role}`);
    await expect(page).toHaveTitle(`Aashaya Aryal | ${title}`);
    await expect(page.locator(".role-title")).toHaveText(title);
    await expect(page.locator(".section-nav")).toHaveCount(0);
    await expect(
      page.locator('#web-resume address a[href^="mailto:"]'),
    ).toHaveAttribute("href", "mailto:ash@karuifeather.com");
    await expect(
      page.locator('#web-resume address a[href^="https:"]'),
    ).toHaveAttribute("href", "https://karuifeather.com");

    for (const tech of await page
      .locator("#web-resume .project .technologies")
      .all()) {
      expect((await tech.innerText()).split(" · ").length).toBeLessThanOrEqual(
        8,
      );
    }

    await page.screenshot({
      path: info.outputPath(`${role}-desktop.png`),
      fullPage: true,
    });

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Cybersecurity", exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${role}-${width}.png`) });
    }

    await page.setViewportSize({ width: 375, height: 850 });
    await page
      .getByRole("button", { name: "Software Engineering", exact: true })
      .click();
    await expect(page.locator(".role-title")).toHaveText("Software Engineer");
    await page.goto(`/?role=${role}`);
    await page.screenshot({
      path: info.outputPath(`${role}-mobile.png`),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Print Resume" }).click();
    await expect(page.locator("#print-toolbar")).toBeVisible();
    await expect(page.locator("#web-resume")).toBeHidden();
    await page.setViewportSize({ width: 1100, height: 1100 });

    const focus = {
      software: "SOFTWARE ENGINEERING | DISTRIBUTED SYSTEMS | CLOUD",
      "data-ai": "DATA SCIENCE | MACHINE LEARNING | DATA ENGINEERING",
      cybersecurity: "CYBERSECURITY | NETWORK SECURITY | RISK & IAM",
    }[role];

    await expect(page.locator(".print-header h1 + .print-focus")).toHaveText(
      focus,
    );
    await expect(page.locator(".print-focus + address")).toBeVisible();
    await expect(page.locator(".print-title")).toHaveCount(0);

    const previewPages = page.locator(".print-page");

    await expect(previewPages).toHaveCount(pages);

    for (const sheet of await previewPages.all()) {
      // Fixed Letter preview geometry must not silently grow beyond one sheet.
      expect(Math.abs((await sheet.boundingBox())!.height - 1056)).toBeLessThan(
        1,
      );
    }

    await page.screenshot({
      path: info.outputPath(`${role}-preview.png`),
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("#print-toolbar")).toBeHidden();
    await expect(page.locator("#print-resume")).toBeVisible();

    const dates = await page
      .locator("#print-resume .date")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect().right),
      );

    expect(Math.max(...dates) - Math.min(...dates)).toBeLessThan(1);

    const pdf = info.outputPath(`${role}.pdf`);

    await page.pdf({
      path: pdf,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const pdfInfo = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });

    expect(pdfInfo).toMatch(new RegExp(`Pages:\\s+${pages}\\b`));

    const text = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" });

    expect(text).toContain(focus);

    const urls = execFileSync("pdfinfo", ["-url", pdf], { encoding: "utf8" });

    expect(urls).toContain("mailto:ash@karuifeather.com");
    expect(urls).toContain("https://karuifeather.com");
    expect(text).not.toContain("Tailor this resume");
    expect(text).not.toContain("Print / Save PDF");
    expect(text).toContain("Mein Bowl, Campus Dining");
    expect(text).toContain("Team Lead");
    expect(text).toContain("Aug 2021 – May 2025");
    expect(text).toContain("AWS Certified Cloud Practitioner");
    expect(text).toContain("Dec 2026");
    expect(errors).toEqual([]);
  });
}

test("visitor panel preserves total and observed countries across role changes", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://d2m530ny36pyb5.cloudfront.net/visitor", (route) => {
    requests++;
    return route.fulfill({
      json: { visitor_count: 1132, countries: ["US", "NP", "US"] },
    });
  });
  await page.goto("/");
  await expect(page.locator("#visitor-count")).toHaveText("1,132");
  await expect(page.locator(".visitor-countries li")).toHaveCount(2);
  await expect(page.locator(".visitor-countries")).toContainText("🇳🇵 Nepal");
  await expect(page.locator(".visitor-countries")).toContainText(
    "🇺🇸 United States",
  );
  await page
    .getByRole("button", { name: "Data / AI / ML", exact: true })
    .click();
  await expect(page.locator("#visitor-count")).toHaveText("1,132");
  expect(requests).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("visitor API failures leave the resume usable without a fake zero", async ({
  page,
}) => {
  await page.route("https://d2m530ny36pyb5.cloudfront.net/visitor", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator("#visitor-stats")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.locator("#visitor-count")).toHaveText("—");
  await expect(page.locator(".visitor-countries li")).toHaveCount(0);
  await expect(page.locator(".role-title")).toHaveText("Software Engineer");
});

test("legacy visitor API still displays its historical total", async ({
  page,
}) => {
  await page.route("https://d2m530ny36pyb5.cloudfront.net/visitor", (route) =>
    route.fulfill({ json: { visitor_count: 132 } }),
  );
  await page.goto("/");
  await expect(page.locator("#visitor-count")).toHaveText("132");
  await expect(page.locator(".visitor-countries li")).toHaveCount(0);
});
