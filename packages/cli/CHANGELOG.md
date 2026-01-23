# @locusai/cli

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
- Updated dependencies
  - @locusai/sdk@0.2.1

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
  - @locusai/sdk@0.2.0

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
