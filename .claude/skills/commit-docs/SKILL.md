---
name: commit-docs
description: Generate technical documentation for commits on the main branch, one entry per commit, written to docs/CHANGELOG.md following the project's technical writing style guide. Use when asked to document commits, update the changelog, write commit-by-commit technical docs, or explain recent changes on main for a technical reader.
---

# Commit Docs

Turns commits on `main` into technical documentation entries in `docs/CHANGELOG.md`. Every entry must follow `STYLE-GUIDE.md` in this skill directory — read it before writing any prose, and reread it if it's been more than a few entries since your last pass.

## Output file and state marker

`docs/CHANGELOG.md` is a single, append-only running log, newest entry at the bottom. Its first lines are always:

```markdown
# Change Log

<!-- commit-docs:last-sha=<full 40-char sha> -->
```

The HTML comment is the only state this skill keeps. It records the last commit on `main` that has been documented. Don't remove it, don't move it, and don't let a human-readable date or note replace it — it must stay machine-parseable as `commit-docs:last-sha=<sha>`.

## Workflow

1. Confirm the repo is clean enough to read reliably: run `git fetch origin main` if a remote exists, then resolve `main`'s tip with `git rev-parse main` (or `origin/main` if that's ahead).
2. Read `docs/CHANGELOG.md` if it exists and extract the `last-sha` marker.
   - **Marker found:** the range to document is `last-sha..main`.
   - **No marker and no file:** this is the first run. Ask the user whether to backfill the entire history of `main` or start the log from the current tip with no backfill — don't guess; a full backfill on a mature repo can be a lot of writing.
   - **Marker found but the sha no longer exists** (rewritten history): tell the user and ask how to proceed rather than picking a range yourself.
3. List the commits to document, oldest first, along the mainline: `git log --first-parent --reverse <range> --format=%H`. `--first-parent` matters here — this repo merges feature work into `main` via PR merge commits, so the mainline is the sequence of merges, not every commit on every feature branch.
4. For each commit in order, gather its facts before writing anything:
   - `git log -1 --format='%H%n%an%n%ad%n%s%n%n%b' <sha>` for the message, date, and (for merge commits) the PR reference GitHub writes into the body.
   - The diff that commit actually introduces to `main`. For a merge commit, that's the merge against its first parent: `git diff <sha>^1..<sha>`. For a plain commit, it's `git show <sha>`.
   - `git diff --stat <sha>^1..<sha>` (or `<sha>^..<sha>` for a non-merge commit) for a quick map of what files moved.
   - Skip a commit only if its introduced diff is empty (an empty merge, a no-op) — note it in one line rather than silently dropping it, so the log stays a complete record.
5. Write one entry per commit (template below), in commit order, and append them all to `docs/CHANGELOG.md`.
6. Update the `last-sha` marker to `main`'s tip resolved in step 1.
7. Show the user the new entries (or a summary if there are many) before considering the task done. Don't commit the updated `docs/CHANGELOG.md` unless the user asks — leave it staged as a normal working-tree change.

## Entry template

```markdown
## <Title-Style Heading Describing The Change>

**Date:** YYYY-MM-DD · **Commit:** `<short-sha>`<!-- add "· **PR:** #123" only if the merge commit references one -->

<One to three paragraphs, third-person indicative, active voice, describing what changed and — only
if the commit message or diff actually shows it — why. Lead with the most important fact. Follow
sentence-length and comma rules from STYLE-GUIDE.md.>

<Only if the change requires a developer to do something differently going forward — a new
command, a config value, a migration step — add a third-level heading in sentence-style
capitalization (for example, "Updating your local setup") followed by a numbered procedure in
second-person imperative. Omit this section entirely when nothing changed about how someone works
with the project.>
```

Rules specific to this template:

- The `##` heading is title-style capitalization (per STYLE-GUIDE.md's H1/H2 rule). Derive it from what the commit does, not a verbatim copy of the commit subject line — commit subjects are often terse or in the imperative-for-git-log style ("Fix X," "Add Y"), which won't always read as a good title, but the underlying claim should match.
- A trivial commit (a typo fix, a dependency bump with no behavior change) still gets an entry — keep it to one short sentence rather than padding it to match the others.
- Never fabricate motivation. If the commit message and diff don't say why, describe only what changed.
- Don't use "we," "I," or the developer's name as the actor. The commit, the code, or the project is the subject: "The dropdown panel now closes on `Escape`," not "We added Escape support."

## Scope

This skill only reads git history and writes to `docs/CHANGELOG.md`. It never rewrites other documentation, never touches CSS or component files, and never pushes or commits on the user's behalf.
