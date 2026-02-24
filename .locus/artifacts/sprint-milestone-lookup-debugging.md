# Sprint Milestone Lookup Debugging (2026-02-24)

## Executive summary
A mismatch in milestone handling made sprint discovery brittle after planning. Sprint lookups used exact title matching, and planning did not guarantee a matching milestone was open. The fix normalizes title matching and reopens closed matching milestones during planning.

## Detailed findings
- `locus sprint` subcommands (`show`, `active`, `close`) compared milestone titles with exact string equality, so case or whitespace differences could cause false "not found" results.
- `locus plan --sprint <name>` treated any matching milestone (including closed ones) as existing and proceeded, which could leave sprint workflows unable to find/open the sprint in default `sprint list` behavior.
- Milestone listing only fetched a single API page. This could miss milestones in repositories with large milestone sets.

## Actionable recommendations
1. Keep milestone title matching normalized (`trim().toLowerCase()`) across sprint and run/status flows.
2. In planning, ensure sprint milestones are open (reopen when matched milestone is closed).
3. Keep paginated milestone fetching to avoid partial data in large repositories.
