# @locusai/shared

## 0.8.0

### Minor Changes

- Exec command improvements

## 0.7.7

### Patch Changes

- Add process name on spawned workers

## 0.7.6

### Patch Changes

- Make the all package versions unified

## 0.7.5

### Patch Changes

- Fix locus version detection and display on banner

## 0.7.4

### Patch Changes

- Exec command improvements

## 0.7.3

### Patch Changes

- Improve CLI logs

## 0.7.2

### Patch Changes

- Add exec command

## 0.7.1

### Patch Changes

- CLI Improvements
  Remove skip-planning option
  Fix repository indexing issue

## 0.7.0

### Minor Changes

- Remove workspace argument requirement

## 0.6.0

### Minor Changes

- Execution workflow improvements
  Default sgent kills

## 0.5.1

### Patch Changes

- Optimize project reindexing to prevent unnecessary index

## 0.5.0

### Minor Changes

- Codex support

## 0.4.16

### Patch Changes

- Update .locus/version on every command

## 0.4.15

### Patch Changes

- Handle stop signals

## 0.4.14

### Patch Changes

- Fix docs url on cli

## 0.4.13

### Patch Changes

- Improve logging

## 0.4.12

### Patch Changes

- SDK build

## 0.4.11

### Patch Changes

- Package builds

## 0.4.10

### Patch Changes

- Fix sdk builds

## 0.4.9

### Patch Changes

- Package resolutions

## 0.4.8

### Patch Changes

- Package builds

## 0.4.7

### Patch Changes

- Package entrypoints

## 0.4.6

### Patch Changes

- Fix package builds

## 0.4.5

### Patch Changes

- Task execution workflow improvements

## 0.4.4

### Patch Changes

- Ignore submodules

## 0.4.3

### Patch Changes

- Modify task spawn options

## 0.4.2

### Patch Changes

- Tree summarizer ignore list

## 0.4.1

### Patch Changes

- Add colors to console
  stdio configuration changes

## 0.4.0

### Minor Changes

- Tree summarizer logs optimized

## 0.3.4

### Patch Changes

- SDK package config

## 0.3.3

### Patch Changes

- Worker resolution

## 0.3.2

### Patch Changes

- Worker path resolution

## 0.3.1

### Patch Changes

- Fix worker resolution

## 0.3.0

### Minor Changes

- Default api base url

## 0.2.2

### Patch Changes

- Fix package builds

## 0.2.1

### Patch Changes

- Update app versions

## 0.2.0

### Minor Changes

- 52d35dd: # 🚀 The "Hybrid Agent" Release

  This release introduces the new **Hybrid Architecture** for Locus, allowing autonomous agents to execute code locally while coordinating via the cloud.

  ## Major Highlights

  ### @locusai/cli

  - **New `locus run` command**: Starts the local agent runtime that connects to the cloud.
  - **Improved `locus index`**: Now creates a semantic map of your codebase for better agent context.
  - **Removed MCP Server**: The standalone MCP server (`locus serve`) has been replaced by the direct agent runtime.
  - **Terminal UI**: Enhanced CLI output with emoji status indicators and clear lifecycle phases.

  ### @locusai/sdk

  - **Agent Orchestrator**: New core engine that manages the agent lifecycle (Dispatch -> Plan -> Execute -> Verify).
  - **Sprint Mindmaps**: Agents now generate high-level technical plans for sprints before executing individual tasks.
  - **Anthropic & Claude CLI Support**: Native integration with Claude for planning and coding.
  - **Artifact Syncing**: Automatically syncs locally generated plans and docs to the Locus Dashboard.

  ### @locusai/shared

  - Updated schemas to support the new `Agent` and `Orchestrator` models.
  - Added `Sprint.mindmap` and `Sprint.mindmapUpdatedAt` fields.

## 0.1.7

### Patch Changes

- - Workflow improvements

## 0.1.6

### Patch Changes

- - Fix mcp paths and workflows

## 0.1.5

### Patch Changes

- - Fix workflow and mcp connection issues

## 0.1.4

### Patch Changes

- - Fix nextjs vulnerabilities

## 0.1.3

### Patch Changes

- - Fixed the cli throwing error after init

## 0.1.2

### Patch Changes

- Fix the documents cannot be created in a nested way inside categories

## 0.1.1

### Patch Changes

- No change
