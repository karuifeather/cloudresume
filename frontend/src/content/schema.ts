import { z } from "zod";

export const trackIds = ["software", "data-ai", "cybersecurity"] as const;

export const trackId = z.enum(trackIds);

export type Track = z.infer<typeof trackId>;

export type View = Track | "full";

const text = z.string().trim().min(1);

const id = text.regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Use a lowercase, hyphenated id",
);

const date = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "Use YYYY or YYYY-MM");

const url = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value), "Use an http(s) URL");

// Role-specific metadata selects content without duplicating records.
const metadata = z
  .object({
    visibility: z.enum(["featured", "normal", "secondary", "hidden"]),
    priority: z.number().int().default(0),
  })
  .strict();

const tracks = z
  .object({
    software: metadata.optional(),
    "data-ai": metadata.optional(),
    cybersecurity: metadata.optional(),
  })
  .strict();

const variants = z
  .object({
    software: text.optional(),
    "data-ai": text.optional(),
    cybersecurity: text.optional(),
  })
  .strict();

const bullet = z
  .object({
    id,
    text,
    active: z.boolean().default(true),
    tracks: tracks.optional(),
    variants: variants.optional(),
  })
  .strict();

const base = {
  id,
  active: z.boolean().default(true),
  tracks,
  priority: z.number().int().default(0),
};

const item = { ...base, name: text, url: url.optional() };

const work = {
  ...item,
  skills: z.array(id).default([]),
  bullets: z.array(bullet).min(1),
};

export const schemas = {
  experience: z
    .object({
      ...work,
      role: text,
      location: text.optional(),
      start: date,
      end: z.union([date, z.literal("present")]),
    })
    .strict(),
  projects: z
    .object({
      ...work,
      subtitle: text.optional(),
      year: z.number().int().min(1900).max(2200).optional(),
    })
    .strict(),
  education: z
    .object({
      ...item,
      institution: text,
      location: text,
      start: date,
      end: date,
      expected: z.boolean().default(false),
      gpa: z.number().min(0).max(4),
      bullets: z.array(bullet).default([]),
    })
    .strict(),
  certifications: z
    .object({ ...item, issuer: text, date, credentialId: text.optional() })
    .strict(),
  awards: z
    .object({
      ...item,
      organization: text.optional(),
      dates: z.array(date).default([]),
      kind: z.enum(["award", "membership"]).default("award"),
    })
    .strict(),
  publications: z
    .object({
      ...base,
      title: text,
      authors: z.array(text).min(1),
      year: z.number().int().min(1900).max(2200),
      venue: text.optional(),
      status: z.enum(["working-paper", "submitted", "accepted", "published"]),
      summary: text.optional(),
      abstract: text.optional(),
      doi: text
        .regex(/^10\.\d{4,9}\/\S+$/, "Use a DOI such as 10.1234/example")
        .optional(),
      paperUrl: url.optional(),
      codeUrl: url.optional(),
      topics: z.array(text).default([]),
    })
    .strict(),
  skills: z.object({ ...base, name: text, category: text }).strict(),
};

export const profileSchema = z
  .object({
    name: text,
    location: text,
    phone: text.regex(/^[\d+() -]+$/),
    email: z.string().email(),
    website: url,
    coursework: z.array(bullet).default([]),
  })
  .strict();

// Print budgets and grouping control the length of targeted resumes.
const limits = z
  .object({
    focusLine: text,
    summary: text.optional(),
    experienceBulletLimits: z
      .record(id, z.number().int().positive())
      .default({}),
    experiences: z.number().int().positive(),
    projects: z.number().int().positive(),
    experienceBullets: z.number().int().positive(),
    projectBullets: z.number().int().positive(),
    skillsPerCategory: z.number().int().positive(),
    skillCategories: z.array(text).min(1),
    skillGroups: z
      .array(z.object({ name: text, skills: z.array(id).min(1) }).strict())
      .min(1)
      .optional(),
    minVisibility: z.enum(["normal", "secondary"]),
    projectsOnNewPage: z.boolean(),
  })
  .strict();

export const trackSchema = z
  .object({
    id: trackId,
    name: text,
    title: text,
    headline: text,
    summary: text,
    capabilities: z
      .array(z.object({ name: text, skills: z.array(id).min(1) }).strict())
      .length(3),
    web: z
      .object({
        projectsMinVisibility: z.enum(["normal", "secondary"]),
        skillsMinVisibility: z.enum(["normal", "secondary"]),
      })
      .strict(),
    print: limits,
  })
  .strict();

export type Content = {
  [K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>[];
} & {
  profile: z.infer<typeof profileSchema>;
  tracks: z.infer<typeof trackSchema>[];
};

export type Bullet = z.infer<typeof bullet>;

export type Ranked = z.infer<typeof metadata>;

export type RecordBase = z.infer<typeof schemas.skills>;
