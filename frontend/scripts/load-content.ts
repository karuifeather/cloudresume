import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseDocument } from "yaml";
import { z } from "zod";
import {
  schemas,
  profileSchema,
  trackSchema,
  trackIds,
  type Content,
} from "../src/content/schema";

export function yamlFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const file = join(directory, entry.name);

    if (entry.isDirectory()) {
      return yamlFiles(file);
    }

    if (/\.ya?ml$/.test(entry.name)) {
      return [file];
    }

    return [];
  });

  return files.sort();
}

export function parseFile<T>(file: string, schema: z.ZodType<T>): T {
  const source = readFileSync(file, "utf8");
  const document = parseDocument(source, { uniqueKeys: true });

  // Report YAML syntax errors before checking the record's fields.
  if (document.errors.length) {
    const messages = document.errors.map((error) => error.message).join("\n");

    throw new Error(`${file}: ${messages}`);
  }

  const result = schema.safeParse(document.toJS());

  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const field = issue.path.join(".");

      return `  ${field}: ${issue.message}`;
    });

    throw new Error(`${file}:\n${messages.join("\n")}`);
  }

  return result.data;
}

function validateSkillReferences(
  references: string[],
  knownSkills: Set<string>,
  source: string | undefined,
  field = "skills",
) {
  for (const reference of references) {
    if (!knownSkills.has(reference)) {
      throw new Error(`${source}: ${field}: unknown reference "${reference}"`);
    }
  }
}

function validateBulletIds(
  bullets: { id: string }[],
  source: string | undefined,
) {
  const ids = new Set<string>();

  for (const bullet of bullets) {
    if (ids.has(bullet.id)) {
      throw new Error(`${source}: bullets: duplicate id ${bullet.id}`);
    }

    ids.add(bullet.id);
  }
}

function validatePrintSettings(
  settings: Content["tracks"][number]["print"],
  content: Content,
  source: string | undefined,
  knownSkills: Set<string>,
) {
  for (const group of settings.skillGroups ?? []) {
    validateSkillReferences(
      group.skills,
      knownSkills,
      source,
      "print.skillGroups",
    );
  }

  const categories = new Set(content.skills.map((skill) => skill.category));

  for (const category of settings.skillCategories) {
    if (!categories.has(category)) {
      throw new Error(
        `${source}: print.skillCategories: unknown category "${category}"`,
      );
    }
  }

  const jobs = new Set(content.experience.map((job) => job.id));

  for (const job of Object.keys(settings.experienceBulletLimits)) {
    if (!jobs.has(job)) {
      throw new Error(
        `${source}: print.experienceBulletLimits: unknown experience "${job}"`,
      );
    }
  }
}

export function loadContent(root: string): Content {
  const data = {
    profile: parseFile(join(root, "profile.yaml"), profileSchema),
    tracks: [],
  } as unknown as Content;

  // Keep source paths so cross-file errors point to editable YAML files.
  const sources = new Map<string, string>();
  const collectionSchemas = { ...schemas, tracks: trackSchema };

  for (const [kind, schema] of Object.entries(collectionSchemas)) {
    const files = yamlFiles(join(root, kind));
    const records = files.map((file) => {
      const record = parseFile(file, schema as z.ZodTypeAny);
      const key = `${kind}/${record.id}`;

      if (sources.has(key)) {
        const previousSource = sources.get(key);

        throw new Error(
          `${file}: duplicate id ${record.id} (also in ${previousSource})`,
        );
      }

      sources.set(key, relative(root, file));

      return record;
    });

    Object.assign(data, { [kind]: records });
  }

  for (const track of trackIds) {
    const configured = data.tracks.some((record) => record.id === track);

    if (!configured) {
      throw new Error(`tracks: missing ${track} configuration`);
    }
  }

  // References can only be checked once every collection has been loaded.
  const knownSkills = new Set(data.skills.map((skill) => skill.id));

  for (const [kind, records] of Object.entries(data)) {
    if (!Array.isArray(records)) {
      continue;
    }

    for (const record of records) {
      const source = sources.get(`${kind}/${record.id}`);

      if ("skills" in record) {
        validateSkillReferences(record.skills, knownSkills, source);
      } else if ("capabilities" in record) {
        const references = record.capabilities.flatMap(
          (capability) => capability.skills,
        );

        validateSkillReferences(references, knownSkills, source);
      }

      if (
        "start" in record &&
        record.end !== "present" &&
        record.end < record.start
      ) {
        throw new Error(`${source}: end must not precede start`);
      }

      if ("bullets" in record) {
        validateBulletIds(record.bullets, source);
      }

      if ("print" in record) {
        validatePrintSettings(record.print, data, source, knownSkills);
      }
    }
  }

  const courseworkIds = data.profile.coursework.map((bullet) => bullet.id);

  if (new Set(courseworkIds).size !== courseworkIds.length) {
    throw new Error("profile.yaml: coursework: duplicate bullet id");
  }

  return data;
}
