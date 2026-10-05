import { z } from "zod";

/** Item types. The type alone decides which vault folder an item lives in. */
export const ITEM_TYPES = [
  "task",
  "note",
  "person",
  "question",
  "decision",
  "reflection",
  "learn",
  "area",
  "capture",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const SOURCES = ["app", "phone", "voice", "chat", "connector", "import", "claude"] as const;

/** Datetime with an explicit UTC offset, e.g. 2026-10-05T15:53:00+08:00. */
export const DateTime = z.iso.datetime({ offset: true, local: false });
/** Calendar date, e.g. 2026-10-12. */
export const DateOnly = z.iso.date();
/** A due date may be a plain date or a datetime. */
export const DateOrDateTime = z.union([DateOnly, DateTime]);

export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase words joined by hyphens");
export const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "id must be a ULID");

const SlugList = z.array(Slug);

/** Fields every item carries. */
const Base = {
  id: Ulid,
  title: z.string().min(1),
  state: z.enum(["open", "closed"]).default("open"),
  created: DateTime,
  updated: DateTime,
  closed: DateTime.optional(),
  areas: SlugList.optional(),
  people: SlugList.optional(),
  links: SlugList.optional(),
  tags: z.array(z.string()).optional(),
  mode: z.enum(["store", "learn"]).default("store"),
  confidential: z.boolean().optional(),
  source: z.enum(SOURCES).optional(),
  summary_signed: DateTime.optional(),
};

export const SrsState = z.object({
  due: DateTime,
  stability: z.number(),
  difficulty: z.number(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.enum(["new", "learning", "review", "relearning"]),
  last_review: DateTime.optional(),
});

// looseObject keeps unknown fields, so files can carry new properties before the app knows them.
export const TaskFields = z.looseObject({
  ...Base,
  type: z.literal("task"),
  due: DateOrDateTime.optional(),
  when: DateOrDateTime.optional(),
  next_step: z.string().optional(),
  snoozed_until: DateTime.optional(),
  notify: z.boolean().optional(),
});
export const NoteFields = z.looseObject({ ...Base, type: z.literal("note") });
export const CaptureFields = z.looseObject({ ...Base, type: z.literal("capture") });
export const PersonFields = z.looseObject({
  ...Base,
  type: z.literal("person"),
  aliases: z.array(z.string()).optional(),
  relation: z.string().optional(),
  birthday: DateOnly.optional(),
});
export const QuestionFields = z.looseObject({
  ...Base,
  type: z.literal("question"),
  ask: Slug.optional(),
  answered: DateTime.optional(),
});
export const DecisionFields = z.looseObject({
  ...Base,
  type: z.literal("decision"),
  decided: DateOnly.optional(),
  status: z.enum(["active", "superseded"]).optional(),
  supersedes: Slug.optional(),
});
export const ReflectionFields = z.looseObject({
  ...Base,
  type: z.literal("reflection"),
  on: SlugList.optional(),
  event: z.string().optional(),
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
});
export const LearnFields = z.looseObject({
  ...Base,
  type: z.literal("learn"),
  deck: Slug.optional(),
  srs: SrsState.optional(),
});
export const AreaFields = z.looseObject({
  ...Base,
  type: z.literal("area"),
  parent: Slug.optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  commitment: z.number().nonnegative().optional(),
});

export const ItemFields = z
  .discriminatedUnion("type", [
    TaskFields,
    NoteFields,
    CaptureFields,
    PersonFields,
    QuestionFields,
    DecisionFields,
    ReflectionFields,
    LearnFields,
    AreaFields,
  ])
  .superRefine((v, ctx) => {
    if (v.state === "closed" && !v.closed) {
      ctx.addIssue({ code: "custom", path: ["closed"], message: "a closed item needs a closed timestamp" });
    }
    if (v.state === "open" && v.closed) {
      ctx.addIssue({ code: "custom", path: ["closed"], message: "an open item can't have a closed timestamp" });
    }
  });

export type ItemFields = z.infer<typeof ItemFields>;
export type TaskItemFields = z.infer<typeof TaskFields>;

/** An item as Stead holds it in memory: its fields, its markdown body, and where it lives. */
export interface Item<F extends ItemFields = ItemFields> {
  fields: F;
  body: string;
  /** Slug, which is also the file name without .md. */
  slug: string;
}

/** Field order in frontmatter. Unknown fields follow, in the order they were found. */
export const FIELD_ORDER = [
  "id",
  "type",
  "title",
  "state",
  "created",
  "updated",
  "closed",
  "areas",
  "people",
  "links",
  "tags",
  "mode",
  "confidential",
  "source",
  "summary_signed",
  // task
  "due",
  "when",
  "next_step",
  "snoozed_until",
  "notify",
  // question
  "ask",
  "answered",
  // decision
  "decided",
  "status",
  "supersedes",
  // reflection
  "on",
  "event",
  "week",
  // learn
  "deck",
  "srs",
  // person
  "aliases",
  "relation",
  "birthday",
  // area
  "parent",
  "icon",
  "colour",
  "commitment",
] as const;

/** Fields left out of the file when they hold their default value. */
export const OMIT_WHEN_DEFAULT: Record<string, unknown> = {
  mode: "store",
  confidential: false,
};
