# Item file format

Version 1, 5 October 2026.

Every item in Stead is one markdown file: YAML frontmatter for the fields, markdown for the body. The format is deliberately close to what Obsidian expects, so if the app ever dies the vault still opens in Obsidian with links, tags and properties working.

The reference implementation is `packages/core` (`parseItem` and `serializeItem`). If this doc and the code disagree, fix one of them; the tests in `packages/core/test` pin the behaviour.

## Vault layout

Files live in a folder per type. The folder is decided by type alone, so changing an item's area, people or links never moves the file. That keeps every item's home stable.

```
vault/
  areas/         area items (Family, Faith, Uni, CHPR5522, UWAYE …)
  people/
  tasks/
  notes/
  questions/
  decisions/
  reflections/
  learn/
  inbox/         captures not yet triaged
  attachments/   images, PDFs, audio, referenced from items
  system/        settings and reconcile checkpoints (not items)
```

The file name is the item's slug plus `.md`, for example `people/kristian-mcelhinney.md`. Slugs are unique across the whole vault, not just within a folder, so `[[kristian-mcelhinney]]` always resolves to exactly one file, as in Obsidian. When a slug is taken, a number is appended (`groceries-2`).

The one time a file moves is when a capture is triaged: it goes from `inbox/` to its type's folder. Retyping any other item needs Dan's confirmation.

## Frontmatter

Fields appear in the order below. Empty fields are left out rather than written as blanks, which keeps files short and diffs clean.

### Every item

| Field | Type | Notes |
|---|---|---|
| `id` | ULID string | Permanent. Never changes, even if the slug does |
| `type` | `task` `note` `person` `question` `decision` `reflection` `learn` `area` `capture` | Decides the folder |
| `title` | string | What shows in lists and chips |
| `state` | `open` `closed` | Default `open` |
| `created` | ISO 8601 with offset | e.g. `2026-10-05T15:53:00+08:00` |
| `updated` | ISO 8601 with offset | Set on every write |
| `closed` | ISO 8601 with offset | Only when `state` is `closed` |
| `areas` | list of slugs | Links to area items |
| `people` | list of slugs | Links to person items |
| `links` | list of slugs | Any other item |
| `tags` | list of strings | Free-form |
| `mode` | `store` `learn` | Default `store` |
| `confidential` | boolean | Shows the badge. Only written when true |
| `source` | `app` `phone` `voice` `chat` `connector` `import` `claude` | Where it came from |
| `summary_signed` | ISO 8601 with offset | When Dan signed off the summary card |

### Extra fields by type

**task**: `due` (date `2026-10-12` or datetime), `when` (the planned time to do it), `next_step` (string), `snoozed_until` (datetime), `notify` (boolean, default true when `when` has a time).

**question**: `ask` (person slug, who's best placed to answer), `answered` (datetime). The answer goes in an `## Answer` section of the body.

**decision**: `decided` (date), `status` (`active` or `superseded`), `supersedes` (slug). Alternatives and reasons go in the body.

**reflection**: `on` (list of slugs the reflection is about), `event` (calendar event UID, when it reflects on a calendar event), `week` (ISO week such as `2026-W41`, for Hearth).

**learn**: `deck` (slug of the area or unit it belongs to), `srs` (FSRS card state, written by Stead: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `last_review`). The body has `## Prompt` and `## Answer` sections.

**person**: `aliases` (list), `relation` (string, how Dan knows them), `birthday` (date).

**area**: `parent` (slug, for the life map's tiers), `icon` (string), `colour` (hex), `commitment` (hours per week, for the rings; only on life commitments such as Family and Faith).

**note** and **capture** have no extra fields.

Unknown fields are kept exactly as found and written back untouched. That's what makes the schema easy to change later: a new field can appear in files before the app knows about it.

## Body

Plain markdown. A few section headings have a fixed meaning:

| Heading | Used by | Meaning |
|---|---|---|
| `## Summary` | any closed item | The signed-off summary card |
| `## Reflection` | any item | Dan's reflection on closing |
| `## Thread` | any item | Timestamped notes and comments, one per line |
| `## Answer` | question, learn | The answer |
| `## Prompt` | learn | The question side of a card |
| `## Goals & Vision` | area | The area's goals, checked at Hearth |

Thread lines look like this, newest last:

```
- 2026-10-05 15:53 · Dan: Asked Kristian, waiting to hear back
- 2026-10-06 08:10 · Claude: Kristian replied by text, quote attached
```

Links in the body use Obsidian's `[[slug]]` or `[[slug|shown text]]`. Stead renders them as typed chips with the target's icon.

## A complete example

```markdown
---
id: 01JA2ZQ8V4N5W6X7Y8Z9A0B1C2
type: task
title: Send Kristian the quote for the Applecross job
state: open
created: 2026-10-05T15:53:00+08:00
updated: 2026-10-05T15:53:00+08:00
areas: [work]
people: [kristian-mcelhinney]
source: voice
due: 2026-10-08
when: 2026-10-07T18:00:00+08:00
---

Measure-up done Saturday. Needs the cornice line items from [[applecross-measure-up]].

## Thread

- 2026-10-05 15:53 · Dan: He wants it before Thursday
```
