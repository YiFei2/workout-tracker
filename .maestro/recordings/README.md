# E2E recordings

Local-only video output of `/e2e-test` runs, for periodically reviewing
whether the app's actual behavior still matches expected behavior.

- One video per flow, named to match: `.maestro/<name>.yaml` →
  `.maestro/recordings/<name>.mp4`. Each new run overwrites the previous
  recording for that flow — there is no history kept.
- Not checked into git (see `.gitignore`) — a single flow's video can run
  tens of MB, and it's fully regenerated on demand, so there's nothing
  worth keeping in version control history.
- If a flow file is renamed or deleted, delete its matching recording too
  so this folder doesn't accumulate orphaned videos.
