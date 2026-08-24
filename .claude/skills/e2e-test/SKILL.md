---
name: e2e-test
description: Write and run a Maestro end-to-end UI test for a recently implemented feature (inferred from git diff/log) or a described feature ($ARGUMENTS). Checks whether a covering test already exists first. Runs the test against the Android emulator; if it uncovers incorrect behavior, fixes it automatically when the fix is trivial (on a fresh branch off main, pushed with an MR), otherwise stops and asks the dev with the specific failure. Use when the user says "e2e test this", "write an e2e test for X", "test the Y feature end to end", or invokes /e2e-test.
user-invocable: true
---

# /e2e-test — Write, dedupe, and run a Maestro flow for a feature

Arguments passed: `$ARGUMENTS` (a feature description, or empty).

This project's Maestro/emulator setup already exists — do not reinstall
anything. Reference:

- Flows live in `.maestro/*.yaml`, app id `com.anonymous.workouttracker`.
- Android SDK: `export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"`
  (already on `PATH` via `~/.zshrc`). Gradle needs
  `JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"`
  (Java 26 is too new for Gradle — build fails with "Unsupported class file
  major version" if you forget this).
- AVD name is `test` (Pixel 6, API 34). Maestro CLI on `PATH` via
  `$HOME/.maestro/bin`.
- Screens have no `testID`s yet — flows target visible text. Check the
  actual component source for exact strings/placeholders before writing
  `tapOn`/`assertVisible` steps; don't guess labels.
- Known gotcha: `ExerciseFormModal`'s rest-seconds field defaults to
  `"90"` (not empty) when adding an exercise — `tapOn` + `inputText` without
  `eraseText` first will produce `"9090"`. Check other forms for similar
  pre-filled defaults before typing into them blind.
- Recordings live in `.maestro/recordings/<flow-name>.mp4`, one per flow,
  named to match the flow file (`.maestro/recordings/README.md` has the
  convention). They're gitignored — local-only, regenerated on demand, not
  for version control.

## Step 1 — Identify the feature under test

- If `$ARGUMENTS` is non-empty, that's the feature description — use it to
  find the relevant screen(s)/component(s) in `app/` and `components/`.
- If `$ARGUMENTS` is empty, infer the feature from recent work:
  `git status`, `git diff HEAD` (uncommitted), and `git log -3 --stat` /
  `git diff main...HEAD` (committed but unmerged) — read the actual changed
  files to understand what behavior changed, don't guess from commit
  messages alone.
- If neither yields a clear feature (e.g. clean tree, no recent commits,
  empty arguments), ask the user what to test rather than picking something
  arbitrary.

## Step 2 — Check for an existing test

- List `.maestro/*.yaml` and read any whose filename or content plausibly
  overlaps the feature (grep for the screen name, key button text, or
  route).
- If an existing flow already covers this feature:
  - If it fully covers the behavior in scope, don't create a duplicate —
    run that flow (Step 4) and treat any gap you notice as something to
    extend, not a reason to write a parallel file.
  - If it covers a related but distinct path (e.g. covers create-template
    but not the new exercise-substitution behavior), extend that file with
    additional steps/assertions rather than creating a near-duplicate flow.
- Otherwise, write a new flow file named for the feature
  (`.maestro/<kebab-case-feature>.yaml`).

## Step 3 — Write the flow

- Read the actual screen/component source for exact visible strings
  (button labels, placeholders, empty-state text) — don't assume.
- Cover the golden path plus at least one meaningful edge case if the
  feature has one (e.g. empty state, validation error, delete/undo).
- Use `clearState: true` on `launchApp` for flows that assume a clean DB,
  unless the test is deliberately building on prior app state.

## Step 4 — Ensure the environment is up and run the test

1. Check the emulator is running: `adb devices`. If not, boot it:
   `emulator -avd test -no-boot-anim &` and wait for
   `adb shell getprop sys.boot_completed` to return `1`.
2. Check Metro is running (`curl -s localhost:8081/status` or check for a
   listening process). If not, `adb reverse tcp:8081 tcp:8081` then
   `npx expo start` in the background.
3. If the diff under test touches native code, config plugins, or
   `app.json`/`package.json` native deps, rebuild: `cd android && JAVA_HOME=... ANDROID_HOME=... ./gradlew assembleDebug`,
   then reinstall with
   `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
   Otherwise the existing install + Metro fast refresh is enough — don't
   rebuild unnecessarily, it costs minutes.
4. Run the flow: `maestro test .maestro/<flow>.yaml` (or the whole
   `.maestro/` directory if you touched a shared sub-flow).

## Step 5 — Handle the result

**If it passes:** record the canonical video for this flow —
`maestro record --local .maestro/<flow>.yaml .maestro/recordings/<flow>.mp4`
(this re-runs the flow once more; `--local` renders on-device instead of
uploading to Maestro Cloud). This overwrites any prior recording for that
flow — there is only ever one video per test case, reflecting the most
recently confirmed-passing behavior. Then report what was tested, where
the flow file lives, and that the recording was updated. Don't commit
automatically — mention the new/changed flow file(s) so the user can
review and commit per their own workflow (this repo commits after each key
feature/section, per CLAUDE.md). Never commit the recording itself.

**If it fails:** open the debug artifacts Maestro prints
(`~/.maestro/tests/<timestamp>/<flow>/screenshots/` and
`screen-hierarchy/`) to see the actual rendered state at the failing step.
Determine why:

- **Test script bug** (wrong selector, stale assumption about a default
  value, timing) — fix the flow file itself and re-run. This is not app
  behavior to report.
- **Trivial app bug** — a small, unambiguous, low-risk fix: typo in
  displayed text, an obvious off-by-one, a missing null/empty-state guard,
  a state-reset bug with one clear correct fix. Fix it on a dedicated
  branch and open an MR (see "Landing a trivial fix" below) rather than
  committing it wherever you happen to be sitting.
- **Non-trivial or ambiguous** — anything requiring a product/design
  decision, touching the data model, with more than one reasonable fix, or
  where you're not confident about the intended behavior: **stop, do not
  guess-fix**. Report to the dev:
  - The exact step that failed and the assertion/selector involved.
  - What was expected vs. what actually rendered (reference the screenshot
    path).
  - Your best hypothesis for the cause, if you have one.
  - Ask what they want done (e.g. via `AskUserQuestion` if there are a
    couple of plausible directions, otherwise just ask in plain text).

## Landing a trivial fix

Trivial fixes are isolated onto their own branch off latest `main` and
opened as an MR — never committed onto whatever branch happens to be
checked out, since that branch's own work-in-progress state shouldn't be
mixed with an unrelated bug fix.

1. `git status` — record what's currently checked out and whether there's
   unrelated uncommitted work. If the fix edit itself is already sitting
   uncommitted in the working tree, capture it first (`git diff` for
   tracked files, or note new files) so it can be reapplied after
   switching branches. Stash anything else unrelated (`git stash -u`) so it
   isn't accidentally swept into the fix branch.
2. `git fetch origin` then `git checkout -b fix/<short-kebab-description>
   origin/main`.
3. Reapply the fix (and the new/updated `.maestro/*.yaml` flow that caught
   it — the flow is the evidence the fix works) on this branch.
4. Rebuild/reinstall only if the fix touched native code; otherwise reload
   is enough. Re-run the flow (`maestro test .maestro/<flow>.yaml`) to
   confirm it now passes on this branch, then refresh its recording
   (`maestro record --local .maestro/<flow>.yaml .maestro/recordings/<flow>.mp4`)
   so the video reflects the now-fixed behavior.
5. Commit with a message describing the bug and the fix, referencing the
   flow that caught it.
6. `git push -u origin fix/<short-kebab-description>`, then
   `gh pr create` targeting `main` with a summary of the incorrect
   behavior, the fix, and the test plan (the Maestro flow that now passes).
7. Report the MR URL to the user.
8. Restore the original state: `git checkout <original-branch>` and
   `git stash pop` if anything was stashed in step 1 — leave things as you
   found them so any in-progress feature work isn't disrupted.

## Notes

- Only push/commit/open an MR for the trivial-fix path above. Otherwise
  this skill only writes/runs tests — it doesn't commit test-only changes
  or touch branches.
- Cap fix attempts at one trivial fix + one re-run. If the flow still fails
  after that, treat it as non-trivial and escalate per Step 5 rather than
  iterating blindly.
