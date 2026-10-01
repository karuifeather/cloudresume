import type { Content, Track, View, Bullet, Ranked } from "./schema";

export const visibilityRank = {
  featured: 0,
  normal: 1,
  secondary: 2,
  hidden: 3,
};

type Targetable = {
  id: string;
  active: boolean;
  tracks: Partial<Record<Track, Ranked>>;
  priority?: number;
  date?: string;
  start?: string;
  year?: number;
};

// Visibility is shared; each section chooses its own ordering.
function visibleForTrack<T extends Targetable>(
  items: T[],
  view: View,
  minVisibility: "normal" | "secondary" = "secondary",
): T[] {
  return items.filter((item) => {
    if (!item.active) {
      return false;
    }

    if (view === "full") {
      return true;
    }

    const visibility = item.tracks[view]?.visibility ?? "hidden";

    return visibilityRank[visibility] <= visibilityRank[minVisibility];
  });
}

// Work history never uses relevance or priority to order visible jobs.
export function sortExperience<
  T extends Targetable & { start: string; end: string },
>(
  items: T[],
  view: View,
  minVisibility: "normal" | "secondary" = "secondary",
): T[] {
  return visibleForTrack(items, view, minVisibility).sort((a, b) => {
    const currentOrder =
      Number(b.end === "present") - Number(a.end === "present");
    return (
      currentOrder ||
      b.end.localeCompare(a.end) ||
      b.start.localeCompare(a.start) ||
      a.id.localeCompare(b.id)
    );
  });
}

// Rank by visibility, priority, then recency; IDs break ties consistently.
export function rankItems<T extends Targetable>(
  items: T[],
  view: View,
  minVisibility: "normal" | "secondary" = "secondary",
): T[] {
  const metadata = (item: T) =>
    view === "full"
      ? { visibility: "normal" as const, priority: item.priority ?? 0 }
      : (item.tracks[view] ?? { visibility: "hidden" as const, priority: 0 });

  const date = (item: T) => item.date ?? item.start ?? String(item.year ?? "");

  const visibleItems = visibleForTrack(items, view, minVisibility);

  return visibleItems.sort((a, b) => {
    const first = metadata(a);
    const second = metadata(b);

    const visibilityOrder =
      visibilityRank[first.visibility] - visibilityRank[second.visibility];

    const priorityOrder = second.priority - first.priority;
    const dateOrder = date(b).localeCompare(date(a));

    return (
      visibilityOrder || priorityOrder || dateOrder || a.id.localeCompare(b.id)
    );
  });
}

export function getBullets(bullets: Bullet[], view: View, limit = Infinity) {
  // Untargeted bullets are available to every role.
  const inherited = { visibility: "normal" as const, priority: 0 };

  return rankItems(
    bullets.map((b) => ({
      ...b,
      tracks: b.tracks ?? {
        software: inherited,
        "data-ai": inherited,
        cybersecurity: inherited,
      },
    })),
    view,
  )
    .slice(0, limit)
    .map((b) => ({
      ...b,
      text: view === "full" ? b.text : (b.variants?.[view] ?? b.text),
    }));
}

export function createResumeEngine(content: Content) {
  function getProfile(view: View) {
    const software = content.tracks.find((t) => t.id === "software")!;

    if (view === "full") {
      return {
        ...software,
        title: "Full Professional Background",
        headline: "Software Engineering • Data / AI / ML • Cybersecurity",
        summary: "",
        capabilities: [],
      };
    }

    return content.tracks.find((t) => t.id === view)!;
  }

  function getResume(view: View, print = false) {
    const profile = getProfile(view);
    // Full Background stays complete; targeted print views use page budgets.
    const limits = print && view !== "full" ? profile.print : undefined;

    const filter = <T extends Targetable>(items: T[]) =>
      rankItems(items, view, limits?.minVisibility);

    const withBullets = <T extends Targetable & { bullets: Bullet[] }>(
      items: T[],
      max = Infinity,
    ) =>
      filter(items).map((item) => ({
        ...item,
        bullets: getBullets(item.bullets, view, max),
      }));

    const skills = rankItems(
      content.skills,
      view,
      limits?.minVisibility ?? profile.web.skillsMinVisibility,
    ).filter((s) => !limits || limits.skillCategories.includes(s.category));

    const categories = limits?.skillCategories ?? [
      ...new Set(skills.map((s) => s.category)),
    ];

    // Print tracks may specify curated groups; otherwise use category order.
    const skillGroups = limits?.skillGroups
      ? limits.skillGroups
          .map((group) => ({
            category: group.name,
            items: group.skills.flatMap((id) =>
              rankItems(content.skills, view, limits.minVisibility).filter(
                (skill) => skill.id === id,
              ),
            ),
          }))
          .filter((group) => group.items.length)
      : categories
          .map((category) => ({
            category,
            items: skills
              .filter((s) => s.category === category)
              .slice(0, limits?.skillsPerCategory ?? Infinity),
          }))
          .filter((g) => g.items.length);

    return {
      person: content.profile,
      profile,
      view,
      experience: sortExperience(
        content.experience,
        view,
        limits?.minVisibility,
      )
        .slice(0, limits?.experiences ?? Infinity)
        .map((item) => ({
          ...item,
          bullets: getBullets(
            item.bullets,
            view,
            limits?.experienceBulletLimits[item.id] ??
              limits?.experienceBullets,
          ),
        })),
      projects: withBullets(
        rankItems(
          content.projects,
          view,
          limits?.minVisibility ?? profile.web.projectsMinVisibility,
        ),
        limits?.projectBullets,
      ).slice(0, limits?.projects ?? Infinity),
      education: withBullets(content.education),
      coursework: getBullets(
        content.profile.coursework,
        view,
        print ? 1 : Infinity,
      ),
      skills: skillGroups,
      certifications: filter(content.certifications),
      awards: filter(content.awards),
      publications: filter(content.publications),
    };
  }

  return {
    getProfile,
    getResume,
    getExperience: (view: View) => getResume(view).experience,
    getProjects: (view: View) => getResume(view).projects,
    getSkills: (view: View) => getResume(view).skills,
    getCertifications: (view: View) => getResume(view).certifications,
    getAwards: (view: View) => getResume(view).awards,
    getPublications: (view: View) => getResume(view).publications,
  };
}

export type Resume = ReturnType<
  ReturnType<typeof createResumeEngine>["getResume"]
>;

export function viewFromUrl(url: URL): View {
  const role = url.searchParams.get("role");

  return role === "software" ||
    role === "data-ai" ||
    role === "cybersecurity" ||
    role === "full"
    ? role
    : "software";
}
