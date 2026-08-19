# Planning board in this repository

This document is the agent-facing protocol for **what is next, what is in
flight, and what is done**. Read it together with
[`documentation/jj.md`](jj.md).

```text
This file     = how to use the board (intent)
jj.md         = how to isolate and publish code (execution)
plan/         = the board itself (source of truth for intent)
```

Do **not** treat a chat todo list, a session scratchpad, or a private note as
project state. If work is real, it is an item file under `plan/items/`.

If `plan/` does not exist yet, create it on first use. Do not wait for a human
to seed it.

---

## Mental model

Two layers. Do not collapse them.

```text
Intent (this board)              Execution (jj)
────────────────────             ──────────────────────────
goal / milestone / task          workspace + local stack
ready / claimed / done           mutable changes, then bookmark
links between items              change IDs recorded on the item
```

- The board answers: *what should exist, what is blocked, who claimed it, what
  already landed, how pieces relate.*
- `jj` answers: *where the files are being edited, and how that work becomes a
  PR.*

A task on the board may exist long before any workspace. A workspace should not
exist without a claimed item, except for throwaway exploration that you will
either promote to an item or abandon.

```text
1 item   =  1 claimed owner at a time
         =  1 jj workspace once execution starts
         =  0 or 1 bookmark / PR when the stack is ready to publish
```

---

## Layout

```text
plan/
  GOALS.md           why this project exists (prose; rarely edited)
  NOW.md             one-screen snapshot (derived; items win if they disagree)
  items/
    {id}.md          one work item per file  ← source of truth
```

| Path | Role |
| --- | --- |
| `plan/items/{id}.md` | Canonical record. Status, links, and owner live here. |
| `plan/NOW.md` | Convenience dashboard. Update it when you claim or close. |
| `plan/GOALS.md` | North star in prose. Not a second status field. |
| `documentation/plan.md` | This protocol. |

**One file per item.** Do not keep a single shared `TODO.md` as the tracker.
Parallel agents must be able to claim different items without rewriting the
same file.

The filename must match the frontmatter `id`:

```text
plan/items/engine-legal-play.md    id: engine-legal-play
```

---

## Every agent session

Do this in order. Skip a step only when it does not apply (for example you
were asked to work a specific already-claimed item).

1. Read `plan/NOW.md` if it exists.
2. **Catalog items from frontmatter only** (see [Views](#views)). Do not
   open every item body.
3. **Claim first** — set `status: claimed` and `workspace:` on the item file.
4. Then create or enter the jj workspace named in that field.
   See [`documentation/jj.md`](jj.md).
5. Do the work. When you discover extra work, **add item files** (do not hide
   it in chat).
6. When finished: set `status: done`, record `change_ids` / `bookmark`,
   refresh `plan/NOW.md`.

If you cannot finish, leave the item `claimed` only if you are still the owner
and will resume. Otherwise set it back to `ready` or `blocked` and clear
`workspace`.

---

## Item file format

YAML frontmatter, then a short body. Agents may create, edit, and close these
files without a special CLI.

```markdown
---
id: engine-legal-play
type: task
status: ready
title: Legal play
summary: Follow-suit and trump checks for a single trick.
parent: mil-v1
blocked_by: []
discovered_from: []
relates: []
workspace: ""
change_ids: []
bookmark: ""
---

Follow-suit and trump checks for a single trick.

Acceptance: given a led suit and a hand, illegal cards are identified
the same way GAME.md describes.
```

### Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable kebab-case id. Same as the filename stem. |
| `type` | yes | `goal` \| `milestone` \| `task` \| `note` |
| `status` | yes | See [Status](#status). |
| `title` | yes | Short human label for catalogs. Not the id. |
| `summary` | yes | One line. What this item is. Safe to grep. |
| `parent` | no | One parent id, usually a milestone (or a goal). |
| `blocked_by` | no | List of item ids that must be `done` before this is `ready`. |
| `discovered_from` | no | Item ids this was found while doing. |
| `relates` | no | Other links that are not blocking. |
| `workspace` | when claimed | jj workspace name. Empty when not in flight. |
| `change_ids` | when done | jj change IDs that implemented this item. |
| `bookmark` | if published | Bookmark / PR name, if any. |

`title` and `summary` exist so an agent can list the whole board without
loading bodies. Keep `summary` to **one line** (quote it in YAML if it
contains `:`). Put acceptance criteria, `GAME.md` / `PRESENTATION.md`
pointers, and extra context in the body. Open the body only for items you
are about to claim or unblock.

Lists are YAML lists of ids, not prose. The body is for humans and for the
next agent. Keep it short.

### Types

| Type | Use for |
| --- | --- |
| `goal` | Durable outcome. Few of these. Parent of milestones. |
| `milestone` | A shippable slice with exit criteria. Parent of tasks. |
| `task` | One unit of work one agent can claim. |
| `note` | Decision, constraint, or pointer that is not actionable work. |

If you are unsure, it is a `task`. Do not invent extra types.

### Ids

- Lowercase kebab-case: `engine-legal-play`, `mil-v1`, `goal-playable-crew`.
- Prefix by area when it helps: `engine-`, `skin-`, `mil-`, `goal-`.
- Unique across `plan/items/`. If the file exists, the id is taken.
- Never reuse an id after the item is `done` or `dropped`.

---

## Status

```text
ready ──► claimed ──► done
   ▲         │
   │         ▼
   └── blocked
              │
              ▼
           dropped
```

| Status | Meaning | Who may edit it |
| --- | --- | --- |
| `ready` | Unblocked, nobody owns it. Eligible to claim. | Any agent that will claim it, or an agent unblocking it. |
| `claimed` | One owner. A workspace should exist or is being created. | The owner. Others do not take it. |
| `blocked` | Cannot start. `blocked_by` still has open items, or an external wait. | Any agent updating those blockers. |
| `done` | Finished. Record `change_ids`. | The owner closing it. |
| `dropped` | Will not do. Say why in the body. | Anyone, with a reason. |

**Ready means unblocked.** If `blocked_by` lists an item that is not `done`,
this item is `blocked`, not `ready`. When you close a blocker, set newly
unblocked children to `ready`.

Do not use extra statuses (`in_progress`, `review`, `wip`). `claimed` covers
in-flight work. Review happens on the jj bookmark / PR, not on the board.

---

## Views

These are the questions the board must answer. Compute them from item
**frontmatter**. `plan/NOW.md` should reflect the same facts.

| Question | How to read it |
| --- | --- |
| What’s on the board? | Catalog: `id`, `type`, `status`, `title`, `summary` (see below). |
| What’s next? | `type: task`, `status: ready`, empty or all-done `blocked_by`. |
| What’s in flight? | `status: claimed`, plus `jj workspace list`. |
| What’s blocked? | `status: blocked` (or `ready` with a non-done blocker — treat as blocked and fix the status). |
| What’s done, tied to what? | `status: done`, follow `parent`, `relates`, `discovered_from`, `change_ids`. |
| Why does this exist? | Walk `parent` until a `milestone` or `goal`. |

### Catalog (cheap)

Do **not** `Read` every file under `plan/items/`. The body is detail; the
board is the YAML header.

One search is enough. In Cursor, Grep (not Read) these keys:

```text
pattern:  ^(id|type|status|title|summary|parent):
glob:     plan/items/*.md
```

That returns a handful of lines per item — a table, not the acceptance
text. Filter further with `status: ready`, `type: task`, and so on.

From a shell, the same idea:

```bash
# Catalog: title + summary of every item (frontmatter only)
grep -E '^(id|type|status|title|summary):' plan/items/*.md

# In flight / ready (filenames only)
grep -l '^status: claimed' plan/items/*.md
grep -l '^status: ready' plan/items/*.md
```

Markdown table (still frontmatter only; stops at the second `---`):

```bash
python3 - <<'PY'
from pathlib import Path
items = []
for p in sorted(Path("plan/items").glob("*.md")):
    fm, _, _ = p.read_text().partition("\n---\n")
    d = {}
    for line in fm.splitlines():
        if line.startswith("---") or not line or line[0] in " -":
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            d[k] = v.strip().strip('"')
    items.append(d)
print("| status | type | id | title | summary |")
print("| --- | --- | --- | --- | --- |")
for d in items:
    print(f"| {d.get('status','')} | {d.get('type','')} | `{d.get('id','')}` | {d.get('title','')} | {d.get('summary','')} |")
PY
```

Then **Read one item file** when you will claim it, close it, or need its
acceptance criteria.

Prefer the catalog over `NOW.md` if they disagree. Prefer `NOW.md` over
the catalog only as a one-screen reminder — it is derived.

---

## Claiming

Claim is a file edit, not a chat message.

1. Pick a `ready` task you will actually start.
2. In **that item file**, set:
   - `status: claimed`
   - `workspace: <name>` — same name you will pass to `jj workspace add --name`
3. Only then create the workspace (if it does not exist):

```bash
jj workspace add ../crew-<name> --name <name> -r main
```

4. Update `plan/NOW.md` so the item moves from Next to Now.

Two agents can both read `ready` before either writes. If you open an item and
it is already `claimed` by someone else, **stop**. Put yours back if you
already wrote, pick another item.

The later honest writer keeps the claim. Do not fight over an item. Split off
a new task instead if the work is actually two tasks.

While claimed:

- You own status, body, and new child items.
- Other agents may add `relates` or `discovered_from` **on other files** that
  point at yours. They do not steal `workspace`.
- Do not create a second workspace for the same item.

---

## Creating items

Create `plan/items/{id}.md` as soon as the work is real enough to be found
again after this session.

Minimum viable item: `id`, `type`, `status`, `title`, `summary`, and two
sentences of body (what / why / done-when).

Link it:

| Situation | Field |
| --- | --- |
| It belongs under a milestone or goal | `parent:` |
| It cannot start until other items finish | `blocked_by:` and `status: blocked` |
| You found it while doing another item | `discovered_from:` |
| Same theme, no order | `relates:` |

Unblock rule: only ids of **other items**. Do not write `blocked_by: [need a
design]` — make a design item and reference that.

If `plan/GOALS.md` or `plan/NOW.md` is missing, create a stub the first time
you need it. `GOALS.md` is prose. `NOW.md` uses the sections below.

---

## `NOW.md`

A snapshot, not a database. Suggested shape:

```markdown
# Now

## In flight
- `engine-legal-play` — workspace `engine` — follow-suit / trump

## Next
- `engine-deal` — deal 40 cards for 3–5 seats

## Blocked
- `skin-geometry` — waits on `view-model-snapshot`

## Recently done
- `mil-rules-notes` — GAME.md is the rules reference
```

When you claim, close, block, or drop, update the matching section. If you
only have time for one write, **write the item file**. Fix `NOW.md` next;
items win.

---

## Closing

When the work is actually done in the jj stack (not “I thought about it”):

1. Set `status: done`.
2. Fill `change_ids` with the jj change IDs that landed the work (the
   described changes in your stack, usually not the empty `@`).
3. Fill `bookmark` if you published.
4. Clear `workspace` or leave it as historical context — either is fine;
   status `done` is what matters.
5. For each item that lists this id in `blocked_by`, if every blocker is
   `done`, set that item to `ready`.
6. Update `plan/NOW.md`.

If the stack is not ready to publish, you may still mark the item `done` when
the *intent* is implemented locally and recorded on `change_ids`. Publishing
is a jj concern (`documentation/jj.md`). Do not invent a `published` status.

Dropped work: `status: dropped`, reason in the body, and unblock or drop
dependents explicitly. Do not leave children waiting on a dropped parent.

---

## Parallel agents

```text
plan/items/*.md     who claimed what, what is next
jj workspace list   which working copies exist
```

Both must stay aligned:

- Claimed item without a workspace: you are about to create it, or you forgot.
  Create it or unclaim.
- Workspace without a claimed item: exploration, leftover, or a protocol
  miss. Promote to an item or `jj workspace forget` when safe.
- Two claimed items may share a theme (`relates`) but not a workspace.

You may add discovered tasks while another agent owns the parent. Create a
**new** item file with `discovered_from: [their-id]`. Do not edit their
claimed file except to add a non-owning link if you must; prefer linking
from *your* new file.

---

## Relation to jj

Follow [`documentation/jj.md`](jj.md) for workspaces, stacks, rewrites, and
publish. This board only records pointers:

| Board field | jj fact |
| --- | --- |
| `workspace` | `jj workspace add --name` / name in `jj workspace list` |
| `change_ids` | Stable jj change IDs from `jj log` |
| `bookmark` | Created at publish time, not while drafting |

Do not create a bookmark because you claimed an item. Do not use bookmarks as
the todo list.

---

## Do not

- Do not use Cursor/chat session todos as the project tracker.
- Do not `Read` every `plan/items/*.md` body to survey the board. Catalog
  `title` / `summary` (and `status`) from frontmatter; open a body only
  for the item you will touch.
- Do not keep status in `AGENTS.md`, `README`, or this protocol file.
- Do not put two items in one file, or one item in two files.
- Do not claim several tasks at once “to hold them.” Claim what you start.
- Do not mark `done` because a plan was written; mark `done` when the work
  exists (or the note’s decision is recorded and no code was required).
- Do not delete `done` items. They are how later agents see old work tied to
  new work. Dropped items stay too, with a reason.
- Do not introduce Jira, GitHub Issues, or another tracker unless a human
  replaces this protocol on purpose.

---

## Quick reference

```text
What’s on the board?  grep id/type/status/title/summary in plan/items/
What’s next?          items with status: ready
Who’s working?        items with status: claimed  +  jj workspace list
What’s done?          items with status: done     +  change_ids / parent / relates
```

```bash
# Claim
#   edit plan/items/{id}.md  →  status: claimed, workspace: {name}
#   jj workspace add ../crew-{name} --name {name} -r main
#   update plan/NOW.md

# Discover
#   write plan/items/{new}.md with discovered_from: [{id}]

# Close
#   status: done, fill change_ids, unblock children, update NOW.md
```

New agents: read this file, read `plan/NOW.md`, then [`documentation/jj.md`](jj.md)
before creating a workspace.
