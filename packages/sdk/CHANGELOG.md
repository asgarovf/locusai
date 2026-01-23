# @locusai/sdk

## 0.4.11

### Patch Changes

- Package builds
- Updated dependencies
  - @locusai/shared@0.4.11

## 0.4.10

### Patch Changes

- Fix sdk builds
- Updated dependencies
  - @locusai/shared@0.4.10

## 0.4.9

### Patch Changes

- Package resolutions
- Updated dependencies
  - @locusai/shared@0.4.9

## 0.4.8

### Patch Changes

- Package builds
- Updated dependencies
  - @locusai/shared@0.4.8

## 0.4.7

### Patch Changes

- Package entrypoints
- Updated dependencies
  - @locusai/shared@0.4.7

## 0.4.6

### Patch Changes

- Fix package builds
- Updated dependencies
  - @locusai/shared@0.4.6

## 0.4.5

### Patch Changes

- Task execution workflow improvements
- Updated dependencies
  - @locusai/shared@0.4.5

## 0.4.4

### Patch Changes

- Ignore submodules
- Updated dependencies
  - @locusai/shared@0.4.4

## 0.4.3

### Patch Changes

- Modify task spawn options
- Updated dependencies
  - @locusai/shared@0.4.3

## 0.4.2

### Patch Changes

- Tree summarizer ignore list
- Updated dependencies
  - @locusai/shared@0.4.2

## 0.4.1

### Patch Changes

- Add colors to console
  stdio configuration changes
- Updated dependencies
  - @locusai/shared@0.4.1

## 0.4.0

### Minor Changes

- Tree summarizer logs optimized

### Patch Changes

- Updated dependencies
  - @locusai/shared@0.4.0

## 0.3.4

### Patch Changes

- SDK package config
- Updated dependencies
  - @locusai/shared@0.3.4

## 0.3.3

### Patch Changes

- Worker resolution
- Updated dependencies
  - @locusai/shared@0.3.3

## 0.3.2

### Patch Changes

- Worker path resolution
- Updated dependencies
  - @locusai/shared@0.3.2

## 0.3.1

### Patch Changes

- Fix worker resolution
- Updated dependencies
  - @locusai/shared@0.3.1

## 0.3.0

### Minor Changes

- Default api base url

### Patch Changes

- Updated dependencies
  - @locusai/shared@0.3.0

## 0.2.2

### Patch Changes

- Fix package builds
- Updated dependencies
  - @locusai/shared@0.2.2

## 0.2.1

### Patch Changes

- Update app versions
- Updated dependencies
  - @locusai/shared@0.2.1

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

### Patch Changes

- Updated dependencies [52d35dd]
  - @locusai/shared@0.2.0
