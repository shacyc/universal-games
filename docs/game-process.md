# The game development process

How a game goes from an idea to a card in the hub. It exists because the first
three games were each built a different way, and nothing recorded what was
decided, what was left out, or how far along anything was.

`docs/building-a-game.md` is the **technical** contract — what an agent may
touch and what "done" means in code. This file is the **process** contract —
which documents must exist, when, and who writes them.

## The rule, in one paragraph

Every game owns four documents in `games/<slug>/docs/`. Nobody writes game code
until the first two exist. Nobody finishes a working session without updating
`progress.md`. If an agent is asked to build a game and the documents are not
there, **it stops and drafts them with the owner first** — that is not
initiative, it is the required first step.

## The four documents

| File | Answers | Written by | When | Changes after that? |
| --- | --- | --- | --- | --- |
| `brief.md` | what and why | **owner**, with the agent asking the questions | before any code | frozen; a change is a new decision the owner signs |
| `plan.md` | how | **agent**, approved by the owner | after the brief is frozen | edited as reality bites, with §8 recording why |
| `testplan.md` | how we know it works | agent, from the brief's acceptance criteria | with the plan, **before** the code | grows — every bug adds a case |
| `progress.md` | where we actually are | agent | from the first session onward | every session, without exception |

Templates: `docs/templates/game-docs/`. Copy all four, keep the file names.

They live inside `games/<slug>/` on purpose. An agent already owns exactly that
directory (`docs/building-a-game.md` §1), so it can keep its own progress
current without touching shared files and without conflicting with another
agent working on another game in parallel.

## Gates

Each gate is a state the work cannot leave until the condition holds.

**Gate 0 — Brief frozen.** `brief.md` has no `TODO` left, §10 has no open
question, and the header says `Status: Frozen` with a date. The owner is the
only one who can freeze it.
*Nothing before this gate is code.* If the owner asks for a game and there is no
brief, the agent runs the interview (`/new-game <slug>`) and produces a draft to
argue with — a draft brief is a much better question than a list of questions.

**Gate 1 — Plan approved.** `plan.md` §1 module map, §6 SDK call inventory and
§9 task breakdown are filled, `testplan.md` §1 lists a case for every acceptance
criterion, and the owner has said yes. `progress.md` exists with every task as
`todo`.
Two things the owner is really checking here: that §6 contains no SDK method
that does not exist, and that §9 has no task big enough to hide a week in.

**Gate 2 — Implementation.** Work proceeds task by task from `plan.md` §9. Every
session: read `progress.md` first, append a session-log entry last. A task moves
to `done` only with evidence in the table.

**Gate 3 — Verified.** `testplan.md` §1 and §3 are all `pass`, §2 has been run
on a real phone, and the date and device are recorded in its header.

**Gate 4 — Shipped.** `progress.md` §2 fully ticked, status `Shipped`, and its
session log closes with the handover entry described in
`docs/building-a-game.md` §11 — a summary *of* these documents, not a
replacement for them.

## What an agent does, every session

The operational procedure — what to read, how to work out which gate you are at,
how to run the brief interview, and the five-step ritual before you stop — lives
in **`docs/building-a-game.md` §0**, because that file is the entry point an
agent is pointed at and it has to work with no tooling and no prior context.
It is the source of truth; do not restate it here.

This file stays the *why*: the gates above, the ownership table, and the rules
below.

## The two mechanical checks

Documents that only a person checks rot. Two things check them without being
asked, and both are deliberately outside any one assistant's tooling so they
work whoever — or whatever — is doing the work:

| | What it does |
| --- | --- |
| `pnpm game:status [slug]` | Computes each game's gate from `docs/game-gates.json` against the files on disk, and reports where that disagrees with `progress.md`. |
| `pnpm game:check <slug>` | A verdict on the gate the game is trying to leave: what is met, what is not, and which platform rules are broken regardless. |
| `.githooks/pre-commit` | Refuses a commit that breaks a §3 rule mechanically. Installed by `pnpm install` (the `prepare` script); bypass once with `SKIP=1 git commit`. |

**Advisory by default, blocking only where the code is objectively wrong.**
That split matters more than it looks. `localStorage` in a game, an SDK-client
import outside `session.ts`, a game commit that also edits `packages/sdk/` —
those are broken code and the hook refuses them. A `progress.md` that was not
updated only warns. Blocking everything reads as rigour and ends as
`SKIP=1` in muscle memory, at which point nothing is enforced at all.

`docs/game-gates.json` is the machine-readable twin of
`docs/building-a-game.md` §0 Step 3. Change one, change the other.

## Rules that keep the documents honest

- **The session log is append-only.** Never edit or delete an old entry. A
  reverted wrong turn is the most useful thing in the file.
- **Evidence, not adjectives.** A task is `done` when a test name, a commit or a
  manual case ID says so. "Works" is not evidence.
- **The brief does not drift.** If implementation contradicts the brief, that is
  a deviation in `progress.md` §4 and a conversation with the owner — not a
  quiet edit to the brief.
- **A `TODO(owner)` blocks.** An agent may draft an answer and mark it as a
  proposal, but it may not delete the marker on the owner's behalf.
- **An SDK gap is reported, never fixed.** `progress.md` §6 is the input to the
  next platform milestone. Growing the SDK is decided in `CLAUDE.md`, not in a
  game.
- **Documents are part of the diff.** A commit that changes
  `games/<slug>/src/` and not `games/<slug>/docs/progress.md` is incomplete.

## Starting a session

The process must survive being run by an assistant with no slash commands, no
project memory and no plugins. So the whole thing is reachable from one
sentence, and that sentence is the only thing you have to remember:

> **Read `docs/building-a-game.md` and build game `<slug>`.**

`docs/building-a-game.md` §0 takes it from there: what to read, which gate the
game is at, and what to do at each one. Paste that line into any assistant, in
any tool, in any language.

Inside Claude Code the same procedure has two shortcuts, which are wrappers
around §0 rather than a second copy of it:

| Command | Does |
| --- | --- |
| `/new-game <slug>` | §0 Step 3A: interviews the owner, writes all four documents, stops before any code. |
| `/game-status [<slug>]` | Reads every `progress.md`, checks its claims against the repo, reports where things really are. |

## Existing games

`2048`, `snake` and `sudoku` predate this process and their briefs are still at
`docs/game-<slug>.md`. `docs/building-a-game.md` §0 Step 2 says what to do about
that. The rule behind it: migrate a game when work next starts on it, never
migrate one nobody is working on, and never keep two copies of a brief.
