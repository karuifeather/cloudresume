import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadContent } from "../scripts/load-content";
import {
  createResumeEngine,
  getBullets,
  rankItems,
  sortExperience,
  viewFromUrl,
} from "../src/content/engine";
import { PrintResume, WebResume, escape, emphasis } from "../src/render";

const root = new URL("../content", import.meta.url).pathname;

const data = loadContent(root);

const engine = createResumeEngine(data);

function fixture(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "resume-content-"));

  try {
    cpSync(root, dir, { recursive: true });
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const metadata = (
  visibility: "featured" | "normal" | "secondary" | "hidden",
  priority = 0,
) => ({ visibility, priority });

test("URL defaults and direct profiles", () => {
  for (const role of [
    "software",
    "data-ai",
    "cybersecurity",
    "full",
  ] as const) {
    assert.equal(
      viewFromUrl(new URL(`https://example.test/?role=${role}`)),
      role,
    );
  }

  assert.equal(viewFromUrl(new URL("https://example.test/")), "software");
  assert.equal(
    viewFromUrl(new URL("https://example.test/?role=invalid")),
    "software",
  );
});

test("ranking: visibility, priority, date, ID, hidden and archived", () => {
  const records = [
    {
      id: "normal",
      active: true,
      tracks: { software: metadata("normal", 100) },
    },
    {
      id: "featured-z",
      active: true,
      date: "2025",
      tracks: { software: metadata("featured", 10) },
    },
    {
      id: "featured-a",
      active: true,
      date: "2025",
      tracks: { software: metadata("featured", 10) },
    },
    {
      id: "recent",
      active: true,
      date: "2026",
      tracks: { software: metadata("featured", 10) },
    },
    {
      id: "highest",
      active: true,
      date: "2024",
      tracks: { software: metadata("featured", 20) },
    },
    { id: "hidden", active: true, tracks: { software: metadata("hidden") } },
    {
      id: "archived",
      active: false,
      tracks: { software: metadata("featured", 500) },
    },
  ];

  assert.deepEqual(
    rankItems(records, "software").map((r) => r.id),
    ["highest", "recent", "featured-a", "featured-z", "normal"],
  );
  assert.ok(rankItems(records, "full").some((r) => r.id === "hidden"));
  assert.ok(!rankItems(records, "full").some((r) => r.id === "archived"));
});

test("experience uses dates regardless of relevance, with visibility applied first", () => {
  const job = (
    id: string,
    start: string,
    end: string,
    visibility: "featured" | "secondary" | "hidden",
    priority: number,
  ) => ({
    id,
    start,
    end,
    active: true,
    priority,
    tracks: { software: metadata(visibility, priority) },
  });
  const jobs = [
    job("old", "2018-05", "2020-07", "featured", 999),
    job("recent", "2021-08", "2025-05", "secondary", -10),
    job("current", "2025-08", "present", "secondary", -100),
    job("same-end", "2020-01", "2025-05", "featured", 1000),
    job("hidden", "2026-01", "present", "hidden", 2000),
    {
      ...job("archived", "2027-01", "present", "featured", 3000),
      active: false,
    },
  ];
  const original = jobs.map((j) => j.id);
  assert.deepEqual(
    sortExperience(jobs, "software").map((j) => j.id),
    ["current", "recent", "same-end", "old"],
  );
  assert.deepEqual(
    sortExperience(jobs, "software", "normal").map((j) => j.id),
    ["same-end", "old"],
  );
  assert.deepEqual(
    sortExperience(jobs, "full").map((j) => j.id),
    ["hidden", "current", "recent", "same-end", "old"],
  );
  assert.deepEqual(
    jobs.map((j) => j.id),
    original,
  );
});

test("web, print, and Full Background render the chronological work timeline", () => {
  const expected = [
    "jsu-research-assistant",
    "mein-bowl-team-lead",
    "bidhee-java-developer",
    "upwork-fullstack",
  ];
  for (const view of [
    "software",
    "data-ai",
    "cybersecurity",
    "full",
  ] as const) {
    for (const print of [false, true]) {
      const resume = engine.getResume(view, print);
      const ids =
        (print && view !== "full") || view === "cybersecurity"
          ? expected.slice(0, 3)
          : expected;
      assert.deepEqual(
        resume.experience.map((j) => j.id),
        ids,
      );
      const html = print ? PrintResume(resume, data) : WebResume(resume, data);
      const positions = resume.experience.map((j) =>
        html.indexOf(escape(j.name)),
      );
      assert.ok(
        positions.every(
          (position, index) =>
            position >= 0 && (index === 0 || position > positions[index - 1]),
        ),
      );
    }
  }
});

test("bullet variants and canonical fallback", () => {
  const bullets = [
    {
      id: "example",
      active: true,
      text: "Canonical",
      variants: { software: "Software wording" },
    },
  ];

  assert.equal(getBullets(bullets, "software")[0].text, "Software wording");
  assert.equal(getBullets(bullets, "data-ai")[0].text, "Canonical");
  assert.equal(getBullets(bullets, "full")[0].text, "Canonical");
});

test("profiles change experience, projects, skills, capabilities and print", () => {
  const software = engine.getResume("software");
  const dataAI = engine.getResume("data-ai");
  const cyber = engine.getResume("cybersecurity");

  assert.equal(software.projects[0].id, "featherspace");
  assert.equal(dataAI.projects[0].id, "network-intrusion-detection");
  assert.equal(cyber.projects[0].id, "guardianlens");
  assert.notDeepEqual(
    software.experience[0].bullets,
    dataAI.experience[0].bullets,
  );
  assert.notDeepEqual(software.skills, cyber.skills);
  assert.equal(software.profile.capabilities.length, 3);

  for (const role of ["software", "data-ai", "cybersecurity"] as const) {
    const resume = engine.getResume(role, true);

    assert.equal(
      resume.projects.length,
      role === "data-ai" ? 6 : role === "software" ? 3 : 2,
    );

    const html = PrintResume(resume, data);

    assert.ok(!html.includes("data-role"));
    assert.ok(html.includes(escape(resume.profile.title)));
  }

  assert.equal(engine.getProjects("full").length, 10);
});

test("new YAML certification and publication automatically render on web, print, and full", () =>
  fixture((dir) => {
    writeFileSync(
      join(dir, "certifications/test-only.yaml"),
      'id: test-only\nname: Test fixture certification\nissuer: Test issuer\ndate: "2026-01"\ntracks:\n  software:\n    visibility: normal\n',
    );
    writeFileSync(
      join(dir, "publications/test-only.yaml"),
      "id: test-only\ntitle: Test fixture publication\nauthors: [Test Author]\nyear: 2026\nstatus: submitted\ntracks:\n  software:\n    visibility: normal\n",
    );

    const content = loadContent(dir);
    const instance = createResumeEngine(content);

    for (const print of [false, true]) {
      const resume = instance.getResume("software", print);

      assert.ok(resume.certifications.some((c) => c.id === "test-only"));
      assert.ok(resume.publications.some((c) => c.id === "test-only"));
      assert.ok(
        (print
          ? PrintResume(resume, content)
          : WebResume(resume, content)
        ).includes("Test fixture publication"),
      );
    }

    assert.equal(instance.getPublications("cybersecurity").length, 0);
    assert.equal(instance.getPublications("full").length, 1);
  }));

test("bad content fails with source and field details", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [
      { tracks: { software: { visibility: "wrong" } } },
      /test-only.yaml:[\s\S]*tracks.software.visibility/,
    ],
    [{ url: "javascript:alert(1)" }, /test-only.yaml:[\s\S]*url/],
    [
      { skills: ["nonexistent-skill"] },
      /test-only.yaml:[\s\S]*unknown reference/,
    ],
    [{ id: "featherspace" }, /duplicate id featherspace/],
    [{ active: "yes" }, /test-only.yaml:[\s\S]*active/],
    [{ bullets: [] }, /test-only.yaml:[\s\S]*bullets/],
  ];

  for (const [extra, expected] of cases) {
    fixture((dir) => {
      const record = {
        id: "test-only",
        name: "Test fixture",
        tracks: {},
        skills: [],
        bullets: [{ id: "one", text: "Test only" }],
        ...extra,
      };

      writeFileSync(
        join(dir, "projects/test-only.yaml"),
        JSON.stringify(record),
      );
      assert.throws(() => loadContent(dir), expected);
    });
  }
});

test("malformed YAML, invalid months and reversed dates fail", () =>
  fixture((dir) => {
    const file = join(dir, "experience/test-only.yaml");

    writeFileSync(file, "id: [broken");
    assert.throws(() => loadContent(dir), /test-only.yaml/);

    const record = {
      id: "test-only",
      name: "Test",
      role: "Test",
      start: "2026-13",
      end: "2025-02",
      tracks: {},
      bullets: [{ id: "one", text: "Test" }],
    };

    writeFileSync(file, JSON.stringify(record));
    assert.throws(() => loadContent(dir), /start: Use YYYY/);
    record.start = "2026-02";
    writeFileSync(file, JSON.stringify(record));
    assert.throws(() => loadContent(dir), /end must not precede start/);
  }));

test("HTML content is escaped", () => {
  const modified = structuredClone(data);

  modified.profile.name = '<script>alert("x")</script>';
  assert.ok(
    WebResume(
      createResumeEngine(modified).getResume("software"),
      modified,
    ).includes("&lt;script&gt;"),
  );
});

test("explicit emphasis is safe and works in canonical and variant bullets", () => {
  assert.equal(
    emphasis("Use **Linux** & **<img src=x onerror=alert(1)>**."),
    "Use <strong>Linux</strong> &amp; <strong>&lt;img src=x onerror=alert(1)&gt;</strong>.",
  );
  assert.equal(emphasis("Unmatched **marker"), "Unmatched **marker");
  assert.equal(
    emphasis("No inferred Linux emphasis"),
    "No inferred Linux emphasis",
  );

  const resume = engine.getResume("software");

  for (const html of [
    WebResume(resume, data),
    PrintResume(engine.getResume("software", true), data),
  ]) {
    assert.ok(html.includes("<strong>Raspberry Pi 4/5</strong>"));
    assert.ok(html.includes("<strong>API Gateway</strong>"));
  }
});

test("track priorities and Software print skill groups retain canonical references", () => {
  const ids = (role: "software" | "data-ai" | "cybersecurity") =>
    engine.getResume(role, true).experience[0].bullets.map((b) => b.id);

  assert.deepEqual(ids("software"), [
    "testbed",
    "benchmark-harness",
    "suricata-benchmark",
  ]);
  assert.deepEqual(ids("data-ai"), [
    "experimental-datasets",
    "benchmark-harness",
    "suricata-benchmark",
  ]);
  assert.deepEqual(ids("cybersecurity"), ["suricata-benchmark", "testbed"]);

  const groups = engine.getResume("software", true).skills;

  assert.deepEqual(
    groups.map((g) => g.category),
    ["Languages", "Backend", "Frontend & Collaboration", "Cloud & DevOps"],
  );
  assert.deepEqual(
    groups[1].items.map((s) => s.id),
    ["spring-boot", "node-js", "nestjs", "rest-apis"],
  );
  assert.equal(groups[3].items.length, 6);
});

test("unknown print skill-group reference fails validation", () =>
  fixture((dir) => {
    const track = structuredClone(
      data.tracks.find((t) => t.id === "software")!,
    );

    track.print.skillGroups = [{ name: "Backend", skills: ["missing-skill"] }];
    writeFileSync(join(dir, "tracks/software.yaml"), JSON.stringify(track));
    assert.throws(
      () => loadContent(dir),
      /print.skillGroups: unknown reference/,
    );
  }));

test("campus dining uses shared facts with track-specific selection", () => {
  const jobId = "mein-bowl-team-lead";
  const expectedBullets = {
    software: ["team-leadership", "operational-systems"],
    "data-ai": ["demand-planning", "operational-systems"],
    cybersecurity: ["team-leadership", "operational-systems"],
  };

  for (const role of ["software", "data-ai", "cybersecurity"] as const) {
    const resume = engine.getResume(role);
    const job = resume.experience.find((entry) => entry.id === jobId)!;
    const printed = engine.getResume(role, true);
    const printedJob = printed.experience.find((entry) => entry.id === jobId)!;

    assert.equal(job.role, "Team Lead");
    assert.equal(job.name, "Mein Bowl, Campus Dining");
    assert.equal(job.start, "2021-08");
    assert.equal(job.end, "2025-05");
    assert.deepEqual(
      job.bullets.map((bullet) => bullet.id),
      expectedBullets[role],
    );
    assert.equal(printedJob.bullets.length, role === "software" ? 1 : 2);
    assert.equal(printed.experience[1].id, jobId);

    for (const html of [WebResume(resume, data), PrintResume(printed, data)]) {
      assert.ok(html.includes("Aug 2021 – May 2025"));
    }
  }

  const dataJob = engine
    .getResume("data-ai")
    .experience.find((job) => job.id === jobId)!;
  assert.ok(
    dataJob.bullets[1].text.includes("**Excel-based operational data**"),
  );

  const fullJob = engine
    .getResume("full")
    .experience.find((job) => job.id === jobId)!;
  assert.equal(fullJob.bullets.length, 3);
  assert.ok(
    fullJob.bullets.some((bullet) =>
      bullet.text.includes("routine technical troubleshooting"),
    ),
  );
});
