# ## VS Code Extension Technical Roadmap

\### Architecture Overview

The extension will have two main components:

1\. **Chat Interface (Sidebar Panel)** - Wraps the `locus exec` command with streaming output

2\. **Dashboard WebView (Editor Panel)** - Embeds the Next.js dashboard

\### 5-Phase Implementation Plan

**Phase 1: Foundation & Setup**

\- New package at `packages/vscode-extension/`

\- Extension manifest with activation events

\- Configuration system (API URL, model, provider settings)

\- Core services initialization

**Phase 2: Chat Interface Implementation**

\- CLI integration service spawning `locus exec` subprocess

\- Stream processing for real-time output (text deltas, tool executions)

\- React-based WebView with Zustand state management

\- Session management using existing `.locus/sessions/` storage

\- Tool execution visualization (read, write, bash, grep indicators)

**Phase 3: Dashboard WebView Integration**

\- Static Next.js export for embedding

\- VS Code Message API bridge for authentication

\- File path routing to VS Code editor

\- Theme-aware styling

**Phase 4: Deep VS Code Integration**

\- Commands: open chat, new chat, ask about selection

\- Context menus for editor and explorer

\- Keybindings `Cmd+Shift+L` for chat, `Cmd+Shift+D` for dashboard)

\- Status bar integration with thinking indicator

\- File decorations for `.locus` folder and `CLAUDE.md`

**Phase 5: Polish & Distribution**

\- VS Code Marketplace preparation

\- CI/CD pipeline with GitHub Actions

\- Telemetry and localization

\### Key Technical Details

\- **Communication Protocol**: Defined message types for Extension ↔ WebView

\- **Security**: SecretStorage for tokens, strict CSP, input sanitization

\- **Performance**: Lazy loading, message batching, WebView resource preloading

\- **Testing**: Unit, integration, and E2E test strategies

\### File Structure

Complete directory layout with \~40 files across extension host, WebView components, services, and tests.

The roadmap document is saved at:

`.locus/documents/Technical/vscode-extension-roadmap.md`

&lt;promise&gt;COMPLETE&lt;/promise&gt;