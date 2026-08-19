# Using Jujutsu (`jj`) in this repository

This repository is a **colocated** Jujutsu + Git checkout: `.jj/` and `.git/` live
side by side. Day-to-day history work uses `jj`. Git, GitHub, and other Git tools
still work in the primary workspace.

This document describes **how we use `jj` here**, for humans and for agents
working in parallel. It is not a `jj` tutorial.

If you do not already know Jujutsu, start with the official material, then come
back:

- [Official documentation](https://docs.jj-vcs.dev/latest/)
- [Tutorial](https://docs.jj-vcs.dev/latest/tutorial/)
- [Git-comparison](https://docs.jj-vcs.dev/latest/git-comparison/)
- [Glossary](https://docs.jj-vcs.dev/latest/glossary/)
- [CLI reference](https://docs.jj-vcs.dev/latest/cli-reference/)
- [Working copy](https://docs.jj-vcs.dev/latest/working-copy/)
- [Git compatibility](https://docs.jj-vcs.dev/latest/git-compatibility/)
- [Working with GitHub](https://docs.jj-vcs.dev/latest/github/)

---

## Mental model

Do **not** translate Git terms one-to-one:

```text
Git branch   ≠  jj bookmark
Git worktree ≠  jj workspace
Git commit   ≠  jj commit
```

Use this model instead:

```text
Workspace  = physical working copy of a human or an agent
Change     = mutable unit of work (stable change ID, rewriting commit ID)
Stack      = a task made of several related changes
Bookmark   = publication boundary toward Git / GitHub
PR         = the unit we review and merge
```

That split is why `jj` fits this project: agents can rewrite freely locally;
humans publish only when a stack is ready to review.

### Working copy is already saved

`@` is itself a mutable commit. Almost every `jj` command snapshots the working
copy. Rewriting a change usually keeps the same **change ID** even when the Git
commit ID changes. Older versions of a change remain visible with
[`jj evolog`](https://docs.jj-vcs.dev/latest/cli-reference/#jj-evolog).

You do **not** need frequent checkpoint commits just to avoid losing work.
`jj status` and `jj diff` already snapshot `@`.

`jj commit -m "…"` means: describe the current change, then create a new empty
change on top (`jj describe` + `jj new`). Use it when the current work deserves
to become a **distinct change in the stack**, not because you are afraid of
losing files.

The question is not “when do I commit?”. It is:

1. Does this work deserve to become a distinct change in my stack?
2. Does this portion of the stack deserve a bookmark and a PR?

```text
editing
   ↓
automatic jj snapshots
   ↓
change → change → change
   ↓
rewrite / squash / split / rebase
   ↓
clean stack
   ↓
bookmark → push → PR → review → merge
```

The **validation boundary** is bookmark + PR. Changes stay a freely rewritable
draft until then.

---

## This repository

- Colocated: `jj` and `git` share the same working copy in the **default**
  workspace.
- Default bookmark: `main`.
- Prefer `jj` for mutating history. Read-only `git` commands in the primary
  workspace are fine.
- Do **not** use `git worktree`. Jujutsu does not support Git worktrees;
  use [`jj workspace`](https://docs.jj-vcs.dev/latest/working-copy/#workspaces)
  instead. See [Git compatibility](https://docs.jj-vcs.dev/latest/git-compatibility/).

List workspaces:

```bash
jj workspace list
```

Each workspace has its own working-copy commit, also written as
`<workspace-name>@`.

---

## Workspaces for humans and agents

One task, one workspace, one local stack. No bookmark until the stack is ready
to publish.

```text
1 task  =  1 workspace  =  1 local stack  =  0 bookmarks at first
                                          =  1 bookmark / PR when ready
```

Create a workspace from `main`:

```bash
jj workspace add ../crew-auth \
  --name auth \
  -r main
```

The agent (or human) then works in that directory. After a first useful
milestone:

```bash
jj commit -m "wip: implement session model"
```

Repeat as the stack grows:

```text
main
 │
 A  wip: implement session model
 │
 B  wip: add login endpoint
 │
 C  wip: wire frontend authentication
 │
 @  current working copy
```

A stack is a structured draft, not a sacred Git branch. You rewrite it until it
represents the work correctly.

Typical rewrite commands:

| Intent | Command |
| --- | --- |
| Move a change into its parent (drop empty source) | `jj squash -r <change>` |
| Split an oversized change | `jj split -r <change>` |
| Change the description | `jj describe <change>` |
| Reorder or retarget the stack | `jj rebase` |
| Drop a useless checkpoint (descendants land on its parent) | `jj abandon <change>` |

You can develop with:

```text
A  wip: first attempt
B  checkpoint before refactor
C  agent experiment
D  now tests pass
E  cleanup
```

and publish as:

```text
A' feat(auth): introduce session authentication
B' test(auth): add session integration tests
```

See the [CLI reference](https://docs.jj-vcs.dev/latest/cli-reference/) for
`squash`, `split`, `describe`, `rebase`, and `abandon`.

---

## Supervised vs autonomous agents

### Supervised agent (human in the loop)

The human owns the workspace, or sits next to the agent in it. The agent edits
freely on `@`. The human inspects with `jj status` / `jj diff`, decides when a
milestone becomes a new change (`jj commit`), and later rewrites the stack
before any push.

Typical graph:

```text
main
 │
 ●  task: improve authentication
 │
 @  agent working copy   (workspace: auth)
```

The human can intervene at any time: squash, split, abandon, or rebase. The
agent does not publish.

### Autonomous agent (later human review)

Give the agent its own workspace and a local stack. It may rewrite that stack.
It must not create bookmarks or push until the task is complete.

```bash
jj workspace add ../agents/fix-search \
  --name agent-fix-search \
  -r main
```

Standing instructions for the agent:

```text
You own this jj workspace.

Work freely using mutable jj changes.
Create intermediate changes when they are useful milestones.
Do not publish WIP.

You may rewrite, squash, split, and rebase your local stack.

When the task is complete:
- tests must pass
- clean the stack
- create a bookmark for the final PR
- push that bookmark
- open a PR against main (or the agreed base)
```

Example cleanup before publish:

```text
main
 │
 A' feat(search): implement query parser
 │
 B' test(search): cover query parser
 │
 bookmark: agent/search-parser
```

```bash
jj bookmark create agent/search-parser -r @-
jj git push --bookmark agent/search-parser
```

`jj git push` has protections similar to `git push --force-with-lease` when a
remote bookmark has moved, which matters when several agents publish.

### Parallel work

Several workspaces can exist at once:

```text
workspace/default
workspace/auth
workspace/cookies
workspace/agent-cache
workspace/agent-tests
workspace/experiment-x
```

They share one repository (one change DAG). They do not share a working copy.
That is how a human reviews one stack while an agent continues another.

Example of concurrent stacks:

```text
                         agent autonomous
                              │
                              F
                              │
                              G  bookmark agent/cache
                             /
main ───────────────────────●
  │
  │ C cookie abstraction
  │ bookmark refactor/cookies
  │
  └─ A auth model
     │
     B auth API
     │
     D auth frontend
     │
     @ supervised-agent
```

---

## Extracting a sub-task (nested work as a DAG)

Suppose the auth stack is in progress and you discover a smaller piece that
should land independently:

```text
main
 │
 A  auth: session model
 │
 B  auth: login
 │
 @  auth: frontend
```

Create a **new stack from `main`**, not a Git branch off the current work:

```bash
jj workspace add ../crew-cookie \
  --name cookie \
  -r main
```

When that stack is clean:

```bash
jj commit -m "refactor(http): introduce cookie abstraction"
jj bookmark create refactor/cookies -r @-
jj git push --bookmark refactor/cookies
```

Bookmarks map to Git branches when pushed. Create them **at publish time**, not
as the thing you work “on”. See [Working with GitHub](https://docs.jj-vcs.dev/latest/github/).

Then rebase the auth stack onto that bookmark. `-s` means that revision **and
all its descendants**:

```bash
jj rebase -s <auth-root-change-id> -o refactor/cookies
```

```text
BEFORE                         AFTER

main                           main
 ├─ C  cookies                  │
 │                              C  cookies
 └─ A  auth                     │
     │                          A' auth
     B                          │
     │                          B'
     D                          │
                                D'
```

This is not nested branches. It is a **DAG of changes**, with bookmarks only
where you want a PR.

---

## Publishing and stacked PRs

Create a bookmark on the last *described* change, usually `@-` (the working copy
is often empty):

```bash
jj bookmark create feature/auth -r @-
jj git push --bookmark feature/auth
```

Or let `jj` name the bookmark: `jj git push --change @-`.

GitHub has [stacked pull requests](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests)
(public preview). A stack is a chain of PRs where each targets the branch of the
PR below it. GitHub documents that tools such as Jujutsu can manage the local
branches; you then open the PRs on GitHub.

Example:

```text
main
 │
 C  cookie abstraction
 │  bookmark: refactor/cookies
 │
 A  auth model
 │
 B  login
 │  bookmark: feature/auth
```

```text
PR #41  refactor/cookies  →  main
PR #42  feature/auth      →  refactor/cookies
```

GitHub treats that as:

```text
main
  ↑
#41 cookies
  ↑
#42 auth
```

---

## Agents and Git tools

The **default** colocated workspace has a real `.git/`. `git status`, `git log`,
and `git diff` work there. Still prefer `jj` for anything that rewrites history.

**Secondary workspaces** created with `jj workspace add` are **not** colocated
today: they have `.jj/` but no `.git/`. Git-only tools and `git worktree` will
not see them as Git checkouts.

Colocated secondary workspaces are still in progress upstream:
[jj-vcs/jj#8052](https://github.com/jj-vcs/jj/issues/8052).

Until that lands, choose:

| Agents | Layout |
| --- | --- |
| **A. jj-aware (preferred)** | Shared repo, `jj workspace add`, agents use `jj` |
| **B. Git-dependent** | Separate colocated clones per agent, not `git worktree` + `jj` |

This project uses **A**. Teach agents `jj`; do not mix `git worktree` into the
workflow.

When an agent rewrites `@` of another workspace from outside that working copy,
that workspace can become **stale**. Fix with
`jj workspace update-stale` in the affected workspace. See
[Working copy](https://docs.jj-vcs.dev/latest/working-copy/#stale-working-copy).

---

## Quick command map (this repo)

```bash
# Inspect
jj status
jj diff
jj log
jj workspace list
jj evolog                 # history of one change as it was rewritten

# Grow the stack
jj commit -m "…"          # freeze current change, new empty @ on top
jj describe -m "…"        # rename / describe without creating a new change
jj new main               # empty change on main (or another rev)

# Rewrite the draft
jj squash -r <change>
jj split -r <change>
jj rebase -s <root> -o <bookmark-or-change>
jj abandon <change>

# Isolate a task
jj workspace add ../crew-<task> --name <task> -r main
jj workspace forget <name>   # drop the workspace record; delete files separately

# Publish
jj bookmark create <name> -r @-
jj git push --bookmark <name>
```

Do not create a bookmark until the stack is ready for review. Do not treat
intermediate changes as the final Git history.
