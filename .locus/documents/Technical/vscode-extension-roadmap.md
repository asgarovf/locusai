# Locus VS Code Extension - Technical Roadmap

## Executive Summary

This document outlines the technical roadmap for developing a VS Code extension that:
1. **Hosts the Locus web dashboard** directly within VS Code panels/webviews
2. **Provides a chat interface** for executing the `locus exec` command in a side panel

The extension will serve as an integrated development environment experience, bringing Locus capabilities directly into the code editor without context switching.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Phase 1: Foundation & Setup](#3-phase-1-foundation--setup)
4. [Phase 2: Chat Interface Implementation](#4-phase-2-chat-interface-implementation)
5. [Phase 3: Dashboard WebView Integration](#5-phase-3-dashboard-webview-integration)
6. [Phase 4: Deep VS Code Integration](#6-phase-4-deep-vs-code-integration)
7. [Phase 5: Polish & Distribution](#7-phase-5-polish--distribution)
8. [Security Considerations](#8-security-considerations)
9. [Performance Optimization](#9-performance-optimization)
10. [File Structure](#10-file-structure)
11. [API & Communication Protocols](#11-api--communication-protocols)
12. [Testing Strategy](#12-testing-strategy)
13. [Risks & Mitigations](#13-risks--mitigations)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Extension Host │    │   WebView Panels  │                   │
│  │   (Node.js)      │◄──►│   (Browser)       │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│  ┌────────▼─────────┐    ┌────────▼─────────┐                   │
│  │  Chat Provider   │    │  Dashboard View   │                   │
│  │  (Sidebar Panel) │    │  (Editor Panel)   │                   │
│  └────────┬─────────┘    └──────────────────┘                   │
│           │                                                      │
│  ┌────────▼─────────┐    ┌──────────────────┐                   │
│  │  CLI Integration │    │  Locus SDK       │                   │
│  │  (locus exec)    │    │  (@locusai/sdk)  │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
└───────────┼───────────────────────┼──────────────────────────────┘
            │                       │
            ▼                       ▼
    ┌───────────────┐      ┌───────────────┐
    │  Local Claude │      │  Locus API    │
    │  CLI Runtime  │      │  (Cloud)      │
    └───────────────┘      └───────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Extension Host** | Main Node.js process managing lifecycle, commands, providers |
| **Chat Provider** | WebView-based sidebar for interactive AI chat (exec command) |
| **Dashboard View** | WebView panel embedding the Next.js dashboard |
| **CLI Integration** | Spawns and manages `locus exec` subprocess |
| **SDK Integration** | Direct API calls for dashboard features |

---

## 2. Technology Stack

### Extension Core
| Technology | Purpose |
|------------|---------|
| **TypeScript** | Extension development language |
| **VS Code Extension API** | Native VS Code integration |
| **Node.js** | Extension host runtime |
| **esbuild** | Fast bundling for extension |

### WebView (Chat & Dashboard)
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework (consistency with existing web app) |
| **Tailwind CSS** | Styling (VS Code theme integration) |
| **@vscode/webview-ui-toolkit** | Native VS Code look & feel |
| **Zustand** | Client state management |

### Communication
| Technology | Purpose |
|------------|---------|
| **VS Code Message API** | Extension ↔ WebView communication |
| **Child Process (spawn)** | CLI subprocess management |
| **EventEmitter** | Internal event handling |

### Build & Distribution
| Technology | Purpose |
|------------|---------|
| **vsce** | VS Code extension packaging |
| **GitHub Actions** | CI/CD for extension |
| **VS Code Marketplace** | Distribution channel |

---

## 3. Phase 1: Foundation & Setup

### 3.1 Project Initialization

**Deliverables:**
- New package: `packages/vscode-extension/`
- Extension manifest (`package.json`)
- TypeScript configuration
- Build pipeline integration with Turbo

**Directory Structure:**
```
packages/vscode-extension/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── commands/              # VS Code commands
│   ├── providers/             # WebView providers
│   ├── services/              # Business logic
│   └── utils/                 # Utilities
├── webview/                   # WebView source (React)
│   ├── chat/                  # Chat panel source
│   └── dashboard/             # Dashboard panel source
├── resources/                 # Icons, media
├── package.json              # Extension manifest
├── tsconfig.json
└── esbuild.config.js
```

### 3.2 Extension Manifest Configuration

```json
{
  "name": "locus",
  "displayName": "Locus - AI Project Management",
  "description": "AI-powered project management with integrated chat and dashboard",
  "version": "0.1.0",
  "publisher": "locusai",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["AI", "Other"],
  "activationEvents": [
    "workspaceContains:.locus/config.json",
    "onCommand:locus.openDashboard",
    "onCommand:locus.openChat"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [...],
    "viewsContainers": {...},
    "views": {...},
    "menus": {...},
    "configuration": {...}
  }
}
```

### 3.3 Core Extension Setup

**Key Files:**

```typescript
// src/extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // Initialize services
  const configService = new ConfigService(context);
  const sessionService = new SessionService(context);
  const cliService = new CLIService();

  // Register providers
  const chatProvider = new ChatViewProvider(context, cliService, sessionService);
  const dashboardProvider = new DashboardViewProvider(context, configService);

  // Register views
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('locus.chatView', chatProvider),
    vscode.window.registerCustomEditorProvider('locus.dashboard', dashboardProvider)
  );

  // Register commands
  registerCommands(context, { chatProvider, dashboardProvider, configService });

  // Auto-detect Locus project
  await detectLocusProject(context);
}
```

### 3.4 Configuration System

**Settings Schema:**
```json
{
  "locus.apiUrl": {
    "type": "string",
    "default": "https://api.locusai.dev",
    "description": "Locus API endpoint"
  },
  "locus.model": {
    "type": "string",
    "default": "claude-sonnet-4-20250514",
    "enum": ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    "description": "Default AI model"
  },
  "locus.provider": {
    "type": "string",
    "default": "claude",
    "enum": ["claude", "codex"],
    "description": "AI provider"
  },
  "locus.autoActivate": {
    "type": "boolean",
    "default": true,
    "description": "Auto-activate when .locus folder detected"
  }
}
```

---

## 4. Phase 2: Chat Interface Implementation

### 4.1 Chat Sidebar Architecture

The chat interface will be implemented as a WebView-based sidebar panel that wraps the `locus exec` interactive mode.

**Architecture:**
```
┌────────────────────────────────────────┐
│         Chat Sidebar Panel              │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │         Chat Header              │  │
│  │  Session: current | ▼ sessions   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │        Message History           │  │
│  │                                  │  │
│  │  [User] How do I add auth?       │  │
│  │                                  │  │
│  │  [Assistant] I'll help you...    │  │
│  │  ├─ Reading: src/auth/...        │  │
│  │  ├─ Editing: src/middleware/...  │  │
│  │  └─ Result: Auth added ✓         │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  [Type your message...]     Send │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 4.2 CLI Integration Service

**Implementation approach:** Spawn `locus exec` as a subprocess with streaming output.

```typescript
// src/services/cli.service.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface StreamChunk {
  type: 'text_delta' | 'tool_use' | 'tool_result' | 'thinking' | 'result' | 'error';
  content: string;
  tool?: { name: string; input: any };
}

export class CLIService extends EventEmitter {
  private process: ChildProcess | null = null;
  private sessionId: string | null = null;

  async startSession(workspacePath: string, options?: {
    model?: string;
    provider?: string;
    sessionId?: string;
  }): Promise<string> {
    const args = [
      'exec',
      '--interactive',
      '--output-format', 'stream-json'
    ];

    if (options?.model) args.push('--model', options.model);
    if (options?.provider) args.push('--provider', options.provider);
    if (options?.sessionId) args.push('--session', options.sessionId);

    this.process = spawn('locus', args, {
      cwd: workspacePath,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    this.setupStreamHandlers();
    return this.sessionId = generateSessionId();
  }

  private setupStreamHandlers(): void {
    this.process?.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const chunk: StreamChunk = JSON.parse(line);
          this.emit('chunk', chunk);
        } catch {
          this.emit('text', line);
        }
      }
    });

    this.process?.stderr?.on('data', (data: Buffer) => {
      this.emit('error', data.toString());
    });

    this.process?.on('exit', (code) => {
      this.emit('exit', code);
    });
  }

  sendMessage(message: string): void {
    this.process?.stdin?.write(message + '\n');
  }

  async stopSession(): Promise<void> {
    this.process?.stdin?.write('/exit\n');
    this.process?.kill();
    this.process = null;
  }
}
```

### 4.3 Chat WebView Provider

```typescript
// src/providers/chat-view.provider.ts
import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cliService: CLIService,
    private readonly sessionService: SessionService
  ) {
    // Listen to CLI events and forward to WebView
    this.cliService.on('chunk', (chunk) => {
      this.postMessage({ type: 'stream_chunk', data: chunk });
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')
      ]
    };

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);

    // Handle messages from WebView
    webviewView.webview.onDidReceiveMessage(
      this.handleWebviewMessage.bind(this)
    );
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'send_message':
        this.cliService.sendMessage(message.content);
        break;

      case 'start_session':
        await this.cliService.startSession(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
          message.options
        );
        break;

      case 'stop_session':
        await this.cliService.stopSession();
        break;

      case 'list_sessions':
        const sessions = await this.sessionService.listSessions();
        this.postMessage({ type: 'sessions_list', data: sessions });
        break;

      case 'resume_session':
        await this.cliService.startSession(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
          { sessionId: message.sessionId }
        );
        break;
    }
  }

  private postMessage(message: any): void {
    this.view?.webview.postMessage(message);
  }
}
```

### 4.4 Chat WebView UI (React)

**Component Structure:**
```
webview/chat/
├── index.tsx              # Entry point
├── App.tsx                # Main chat application
├── components/
│   ├── ChatHeader.tsx     # Session selector, controls
│   ├── MessageList.tsx    # Scrollable message history
│   ├── Message.tsx        # Individual message (user/assistant)
│   ├── ToolExecution.tsx  # Tool use visualization
│   ├── StreamingText.tsx  # Typewriter effect
│   ├── ChatInput.tsx      # Message input with shortcuts
│   └── SessionPicker.tsx  # Session management modal
├── hooks/
│   ├── useVSCodeAPI.ts    # VS Code message bridge
│   └── useChat.ts         # Chat state management
├── stores/
│   └── chat-store.ts      # Zustand store
└── styles/
    └── chat.css           # VS Code theme-aware styles
```

**Key React Component:**
```tsx
// webview/chat/App.tsx
import React, { useEffect } from 'react';
import { useVSCodeAPI } from './hooks/useVSCodeAPI';
import { useChatStore } from './stores/chat-store';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';

export const App: React.FC = () => {
  const vscode = useVSCodeAPI();
  const { messages, addMessage, updateStreamingMessage, isStreaming } = useChatStore();

  useEffect(() => {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'stream_chunk':
          handleStreamChunk(message.data);
          break;
        case 'sessions_list':
          setSessions(message.data);
          break;
      }
    });

    // Request initial data
    vscode.postMessage({ type: 'list_sessions' });
  }, []);

  const handleSendMessage = (content: string) => {
    addMessage({ role: 'user', content });
    vscode.postMessage({ type: 'send_message', content });
  };

  return (
    <div className="chat-container">
      <ChatHeader />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
};
```

### 4.5 Tool Execution Visualization

Display tool executions (file reads, writes, bash commands) inline with the chat:

```tsx
// webview/chat/components/ToolExecution.tsx
interface ToolExecutionProps {
  tool: {
    name: string;
    input: any;
    result?: any;
    status: 'running' | 'completed' | 'error';
  };
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({ tool }) => {
  const getIcon = () => {
    switch (tool.name) {
      case 'Read': return '📖';
      case 'Write': return '✏️';
      case 'Edit': return '📝';
      case 'Bash': return '💻';
      case 'Grep': return '🔍';
      case 'Glob': return '📁';
      default: return '⚙️';
    }
  };

  const getStatusClass = () => {
    switch (tool.status) {
      case 'running': return 'tool-running';
      case 'completed': return 'tool-completed';
      case 'error': return 'tool-error';
    }
  };

  return (
    <div className={`tool-execution ${getStatusClass()}`}>
      <span className="tool-icon">{getIcon()}</span>
      <span className="tool-name">{tool.name}</span>
      {tool.input?.file_path && (
        <span
          className="tool-path clickable"
          onClick={() => openFile(tool.input.file_path)}
        >
          {tool.input.file_path}
        </span>
      )}
      {tool.status === 'running' && <span className="spinner" />}
      {tool.status === 'completed' && <span className="checkmark">✓</span>}
    </div>
  );
};
```

### 4.6 Session Management

Integrate with existing `.locus/sessions/` storage:

```typescript
// src/services/session.service.ts
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Session {
  id: string;
  createdAt: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  model: string;
  provider: string;
}

export class SessionService {
  private sessionsDir: string;

  constructor(private context: vscode.ExtensionContext) {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.sessionsDir = path.join(workspacePath ?? '', '.locus', 'sessions');
  }

  async listSessions(): Promise<Session[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions: Session[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(this.sessionsDir, file),
            'utf-8'
          );
          sessions.push(JSON.parse(content));
        }
      }

      return sessions.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const content = await fs.readFile(
        path.join(this.sessionsDir, `${sessionId}.json`),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fs.unlink(path.join(this.sessionsDir, `${sessionId}.json`));
  }
}
```

---

## 5. Phase 3: Dashboard WebView Integration

### 5.1 Dashboard Architecture Options

**Option A: Embedded Static Build (Recommended)**
- Build Next.js as static export
- Embed HTML/JS/CSS in extension
- Use VS Code Message API for authentication
- Pros: Fast, offline-capable, no external dependencies
- Cons: Larger extension size, requires build sync

**Option B: Remote Dashboard with Authentication**
- Load dashboard from `https://app.locusai.dev`
- Pass authentication token via message
- Pros: Always up-to-date, smaller extension
- Cons: Requires internet, slower initial load

**Recommendation: Start with Option A for better UX, add Option B as fallback.**

### 5.2 Dashboard Build Integration

Modify `apps/web` to support static export for VS Code:

```javascript
// apps/web/next.config.mjs (additions)
const config = {
  // ... existing config

  // Static export for VS Code extension
  output: process.env.VSCODE_BUILD ? 'export' : undefined,

  // Disable features incompatible with WebView
  ...(process.env.VSCODE_BUILD && {
    images: { unoptimized: true },
    trailingSlash: true,
  })
};
```

**Build Script:**
```json
// packages/vscode-extension/package.json
{
  "scripts": {
    "build:dashboard": "cd ../../apps/web && VSCODE_BUILD=1 bun run build && cp -r out ../packages/vscode-extension/dist/dashboard"
  }
}
```

### 5.3 Dashboard WebView Provider

```typescript
// src/providers/dashboard-view.provider.ts
import * as vscode from 'vscode';

export class DashboardViewProvider implements vscode.WebviewPanelSerializer {
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configService: ConfigService
  ) {}

  async openDashboard(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'locus.dashboard',
      'Locus Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'dashboard')
        ]
      }
    );

    this.panel.webview.html = await this.getDashboardContent();

    // Handle messages from dashboard
    this.panel.webview.onDidReceiveMessage(
      this.handleDashboardMessage.bind(this)
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private async getDashboardContent(): Promise<string> {
    const dashboardPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'dist',
      'dashboard',
      'index.html'
    );

    let html = (await vscode.workspace.fs.readFile(dashboardPath)).toString();

    // Inject VS Code WebView bridge
    const bridgeScript = `
      <script>
        window.vscode = acquireVsCodeApi();
        window.isVSCodeWebView = true;

        // Override fetch for authentication
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
          // Inject auth token
          const token = await new Promise(resolve => {
            window.vscode.postMessage({ type: 'get_token' });
            window.addEventListener('message', function handler(e) {
              if (e.data.type === 'token') {
                window.removeEventListener('message', handler);
                resolve(e.data.token);
              }
            });
          });

          options.headers = {
            ...options.headers,
            'Authorization': \`Bearer \${token}\`
          };

          return originalFetch(url, options);
        };
      </script>
    `;

    html = html.replace('</head>', `${bridgeScript}</head>`);

    // Fix asset paths for WebView
    const webview = this.panel!.webview;
    html = html.replace(
      /src="\/([^"]+)"/g,
      (_, path) => `src="${webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'dashboard', path)
      )}"`
    );

    return html;
  }

  private async handleDashboardMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'get_token':
        const token = await this.configService.getApiToken();
        this.panel?.webview.postMessage({ type: 'token', token });
        break;

      case 'open_file':
        // Open file in VS Code editor
        const uri = vscode.Uri.file(message.filePath);
        await vscode.window.showTextDocument(uri);
        break;

      case 'run_command':
        // Execute VS Code command
        await vscode.commands.executeCommand(message.command, ...message.args);
        break;
    }
  }
}
```

### 5.4 Dashboard Modifications for VS Code

Create VS Code-specific entry points in the web app:

```typescript
// apps/web/src/lib/vscode-bridge.ts
export const isVSCodeWebView = typeof window !== 'undefined' &&
  (window as any).isVSCodeWebView === true;

export const vscodeAPI = isVSCodeWebView ? (window as any).vscode : null;

export function postToVSCode(message: any): void {
  vscodeAPI?.postMessage(message);
}

export function openFileInVSCode(filePath: string): void {
  postToVSCode({ type: 'open_file', filePath });
}

export function executeVSCodeCommand(command: string, ...args: any[]): void {
  postToVSCode({ type: 'run_command', command, args });
}
```

```typescript
// apps/web/src/context/AuthContext.tsx (modifications)
import { isVSCodeWebView, vscodeAPI } from '@/lib/vscode-bridge';

// In AuthProvider, add VS Code token handling:
useEffect(() => {
  if (isVSCodeWebView) {
    // Get token from VS Code extension
    vscodeAPI.postMessage({ type: 'get_token' });

    window.addEventListener('message', (event) => {
      if (event.data.type === 'token') {
        setToken(event.data.token);
      }
    });
  }
}, []);
```

### 5.5 Navigation Integration

Route clicks on file paths to VS Code:

```typescript
// apps/web/src/components/common/FilePath.tsx
import { isVSCodeWebView, openFileInVSCode } from '@/lib/vscode-bridge';

interface FilePathProps {
  path: string;
  line?: number;
}

export const FilePath: React.FC<FilePathProps> = ({ path, line }) => {
  const handleClick = () => {
    if (isVSCodeWebView) {
      openFileInVSCode(path);
    } else {
      // Web behavior - copy to clipboard or show modal
      navigator.clipboard.writeText(path);
    }
  };

  return (
    <span
      className={isVSCodeWebView ? 'cursor-pointer hover:underline' : ''}
      onClick={handleClick}
    >
      {path}{line && `:${line}`}
    </span>
  );
};
```

---

## 6. Phase 4: Deep VS Code Integration

### 6.1 Commands Registration

```typescript
// src/commands/index.ts
import * as vscode from 'vscode';

export function registerCommands(
  context: vscode.ExtensionContext,
  services: {
    chatProvider: ChatViewProvider;
    dashboardProvider: DashboardViewProvider;
    configService: ConfigService;
  }
): void {
  const commands = [
    // Chat commands
    vscode.commands.registerCommand('locus.openChat', () => {
      vscode.commands.executeCommand('locus.chatView.focus');
    }),

    vscode.commands.registerCommand('locus.newChat', () => {
      services.chatProvider.startNewSession();
    }),

    vscode.commands.registerCommand('locus.askAboutSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.document.getText(editor.selection);
        await services.chatProvider.sendMessage(
          `Explain this code:\n\`\`\`\n${selection}\n\`\`\``
        );
      }
    }),

    // Dashboard commands
    vscode.commands.registerCommand('locus.openDashboard', () => {
      services.dashboardProvider.openDashboard();
    }),

    vscode.commands.registerCommand('locus.openTasks', () => {
      services.dashboardProvider.openDashboard('/backlog');
    }),

    vscode.commands.registerCommand('locus.openBoard', () => {
      services.dashboardProvider.openDashboard('/board');
    }),

    // Configuration commands
    vscode.commands.registerCommand('locus.login', () => {
      services.configService.initiateLogin();
    }),

    vscode.commands.registerCommand('locus.logout', () => {
      services.configService.logout();
    }),

    // Project commands
    vscode.commands.registerCommand('locus.init', async () => {
      const terminal = vscode.window.createTerminal('Locus Init');
      terminal.sendText('locus init');
      terminal.show();
    }),

    vscode.commands.registerCommand('locus.indexCodebase', async () => {
      const terminal = vscode.window.createTerminal('Locus Index');
      terminal.sendText('locus index');
      terminal.show();
    })
  ];

  context.subscriptions.push(...commands);
}
```

### 6.2 Context Menu Integration

```json
// package.json (contributes.menus)
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "command": "locus.askAboutSelection",
          "when": "editorHasSelection",
          "group": "locus@1"
        },
        {
          "command": "locus.explainFile",
          "group": "locus@2"
        }
      ],
      "explorer/context": [
        {
          "command": "locus.askAboutFile",
          "when": "resourceScheme == file",
          "group": "locus@1"
        }
      ],
      "view/title": [
        {
          "command": "locus.newChat",
          "when": "view == locus.chatView",
          "group": "navigation"
        }
      ]
    }
  }
}
```

### 6.3 Keybindings

```json
// package.json (contributes.keybindings)
{
  "contributes": {
    "keybindings": [
      {
        "command": "locus.openChat",
        "key": "ctrl+shift+l",
        "mac": "cmd+shift+l"
      },
      {
        "command": "locus.askAboutSelection",
        "key": "ctrl+shift+a",
        "mac": "cmd+shift+a",
        "when": "editorHasSelection"
      },
      {
        "command": "locus.openDashboard",
        "key": "ctrl+shift+d",
        "mac": "cmd+shift+d"
      }
    ]
  }
}
```

### 6.4 Status Bar Integration

```typescript
// src/services/status-bar.service.ts
import * as vscode from 'vscode';

export class StatusBarService {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'locus.openChat';
    this.updateStatus('idle');
  }

  updateStatus(status: 'idle' | 'thinking' | 'error' | 'disconnected'): void {
    switch (status) {
      case 'idle':
        this.statusBarItem.text = '$(comment-discussion) Locus';
        this.statusBarItem.tooltip = 'Click to open Locus chat';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'thinking':
        this.statusBarItem.text = '$(loading~spin) Locus';
        this.statusBarItem.tooltip = 'Locus is thinking...';
        break;

      case 'error':
        this.statusBarItem.text = '$(error) Locus';
        this.statusBarItem.tooltip = 'Locus encountered an error';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
        break;

      case 'disconnected':
        this.statusBarItem.text = '$(debug-disconnect) Locus';
        this.statusBarItem.tooltip = 'Locus is disconnected';
        break;
    }
  }

  show(): void {
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
```

### 6.5 File Decorations for Locus Projects

```typescript
// src/providers/file-decoration.provider.ts
import * as vscode from 'vscode';

export class LocusFileDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    // Decorate .locus folder
    if (uri.path.endsWith('.locus')) {
      return {
        badge: '⚡',
        tooltip: 'Locus configuration folder'
      };
    }

    // Decorate CLAUDE.md
    if (uri.path.endsWith('CLAUDE.md')) {
      return {
        badge: '🤖',
        tooltip: 'AI instructions file'
      };
    }

    return undefined;
  }
}
```

### 6.6 Diagnostics Integration

Report AI suggestions as VS Code diagnostics:

```typescript
// src/providers/diagnostics.provider.ts
import * as vscode from 'vscode';

export class LocusDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('locus');
  }

  addSuggestion(
    uri: vscode.Uri,
    range: vscode.Range,
    message: string,
    suggestion: string
  ): void {
    const diagnostic = new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Information
    );

    diagnostic.source = 'Locus AI';
    diagnostic.code = {
      value: 'ai-suggestion',
      target: vscode.Uri.parse(`command:locus.applySuggestion?${encodeURIComponent(
        JSON.stringify({ uri: uri.toString(), suggestion })
      )}`)
    };

    const existing = this.diagnosticCollection.get(uri) ?? [];
    this.diagnosticCollection.set(uri, [...existing, diagnostic]);
  }

  clear(uri?: vscode.Uri): void {
    if (uri) {
      this.diagnosticCollection.delete(uri);
    } else {
      this.diagnosticCollection.clear();
    }
  }
}
```

---

## 7. Phase 5: Polish & Distribution

### 7.1 VS Code Marketplace Preparation

**Required Assets:**
```
packages/vscode-extension/
├── README.md              # Marketplace description
├── CHANGELOG.md           # Version history
├── LICENSE                # License file
├── icon.png               # 128x128 extension icon
└── assets/
    ├── screenshot-chat.png
    ├── screenshot-dashboard.png
    └── demo.gif
```

**Package.json Marketplace Fields:**
```json
{
  "icon": "icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "badges": [
    {
      "url": "https://img.shields.io/visual-studio-marketplace/v/locusai.locus",
      "href": "https://marketplace.visualstudio.com/items?itemName=locusai.locus",
      "description": "VS Marketplace Version"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/locusai/locus"
  },
  "homepage": "https://locusai.dev"
}
```

### 7.2 CI/CD Pipeline

```yaml
# .github/workflows/vscode-extension.yml
name: VS Code Extension

on:
  push:
    paths:
      - 'packages/vscode-extension/**'
    branches: [main]
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build extension
        run: |
          cd packages/vscode-extension
          bun run build

      - name: Package extension
        run: |
          cd packages/vscode-extension
          npx vsce package

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: locus-vscode
          path: packages/vscode-extension/*.vsix

  publish:
    needs: build
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: locus-vscode

      - name: Publish to Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

### 7.3 Telemetry & Analytics

```typescript
// src/services/telemetry.service.ts
import * as vscode from 'vscode';

export class TelemetryService {
  private enabled: boolean;

  constructor() {
    this.enabled = vscode.env.isTelemetryEnabled;
  }

  trackEvent(event: string, properties?: Record<string, string>): void {
    if (!this.enabled) return;

    // Send to Locus analytics endpoint
    // Respect VS Code telemetry settings
  }

  trackError(error: Error, context?: string): void {
    if (!this.enabled) return;

    // Report errors for debugging
  }
}
```

### 7.4 Localization

```json
// package.nls.json
{
  "locus.openChat": "Open Locus Chat",
  "locus.openDashboard": "Open Locus Dashboard",
  "locus.askAboutSelection": "Ask Locus about selection"
}

// package.nls.ja.json (Japanese example)
{
  "locus.openChat": "Locusチャットを開く",
  "locus.openDashboard": "Locusダッシュボードを開く"
}
```

---

## 8. Security Considerations

### 8.1 Authentication Flow

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  VS Code Ext   │────►│  Locus Auth     │────►│  OAuth/JWT   │
│                │     │  Endpoint       │     │  Provider    │
└───────┬────────┘     └─────────────────┘     └──────────────┘
        │                      │
        │    Token             │ Validate
        │◄─────────────────────┘
        │
        ▼
┌───────────────────┐
│  Secure Storage   │
│  (SecretStorage)  │
└───────────────────┘
```

**Token Storage:**
```typescript
// src/services/config.service.ts
export class ConfigService {
  constructor(private context: vscode.ExtensionContext) {}

  async storeToken(token: string): Promise<void> {
    // Use VS Code's SecretStorage for sensitive data
    await this.context.secrets.store('locus.apiToken', token);
  }

  async getApiToken(): Promise<string | undefined> {
    return this.context.secrets.get('locus.apiToken');
  }

  async clearToken(): Promise<void> {
    await this.context.secrets.delete('locus.apiToken');
  }
}
```

### 8.2 WebView Security

```typescript
// Content Security Policy for WebViews
const csp = [
  `default-src 'none'`,
  `style-src ${webview.cspSource} 'unsafe-inline'`,
  `script-src ${webview.cspSource}`,
  `img-src ${webview.cspSource} https: data:`,
  `font-src ${webview.cspSource}`,
  `connect-src https://api.locusai.dev wss://api.locusai.dev`
].join('; ');

// Add to HTML head
`<meta http-equiv="Content-Security-Policy" content="${csp}">`
```

### 8.3 Input Sanitization

```typescript
// Sanitize user input before sending to CLI
function sanitizeInput(input: string): string {
  // Remove potential shell injection characters
  return input.replace(/[;&|`$]/g, '');
}

// Validate file paths
function isValidPath(path: string, workspaceRoot: string): boolean {
  const resolved = require('path').resolve(workspaceRoot, path);
  return resolved.startsWith(workspaceRoot);
}
```

---

## 9. Performance Optimization

### 9.1 Lazy Loading

```typescript
// Defer heavy imports
export async function activate(context: vscode.ExtensionContext) {
  // Register commands immediately
  registerBasicCommands(context);

  // Lazy load providers when needed
  context.subscriptions.push(
    vscode.commands.registerCommand('locus.openChat', async () => {
      const { ChatViewProvider } = await import('./providers/chat-view.provider');
      // Initialize provider
    })
  );
}
```

### 9.2 WebView Resource Loading

```typescript
// Preload critical resources
const preloadResources = `
  <link rel="preload" href="${styleUri}" as="style">
  <link rel="preload" href="${scriptUri}" as="script">
`;

// Use service worker for caching (in WebView)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
```

### 9.3 Message Batching

```typescript
// Batch multiple rapid updates
class MessageBatcher {
  private queue: any[] = [];
  private timeout: NodeJS.Timeout | null = null;

  add(message: any): void {
    this.queue.push(message);

    if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.flush();
      }, 16); // ~60fps
    }
  }

  private flush(): void {
    if (this.queue.length > 0) {
      this.postMessage({ type: 'batch', messages: this.queue });
      this.queue = [];
    }
    this.timeout = null;
  }
}
```

---

## 10. File Structure

### Complete Extension Structure

```
packages/vscode-extension/
├── src/
│   ├── extension.ts                    # Main entry, activation
│   ├── commands/
│   │   ├── index.ts                    # Command registration
│   │   ├── chat.commands.ts            # Chat-related commands
│   │   └── dashboard.commands.ts       # Dashboard commands
│   ├── providers/
│   │   ├── chat-view.provider.ts       # Chat sidebar WebView
│   │   ├── dashboard-view.provider.ts  # Dashboard panel WebView
│   │   ├── file-decoration.provider.ts # File decorations
│   │   └── diagnostics.provider.ts     # AI suggestion diagnostics
│   ├── services/
│   │   ├── cli.service.ts              # CLI subprocess management
│   │   ├── session.service.ts          # Session persistence
│   │   ├── config.service.ts           # Configuration & auth
│   │   ├── status-bar.service.ts       # Status bar integration
│   │   └── telemetry.service.ts        # Analytics
│   ├── utils/
│   │   ├── workspace.ts                # Workspace utilities
│   │   ├── uri.ts                      # URI handling
│   │   └── constants.ts                # Shared constants
│   └── types/
│       └── index.ts                    # TypeScript types
├── webview/
│   ├── chat/
│   │   ├── index.tsx                   # Chat entry
│   │   ├── App.tsx                     # Chat app
│   │   ├── components/
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── Message.tsx
│   │   │   ├── ToolExecution.tsx
│   │   │   ├── StreamingText.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── SessionPicker.tsx
│   │   ├── hooks/
│   │   │   ├── useVSCodeAPI.ts
│   │   │   └── useChat.ts
│   │   ├── stores/
│   │   │   └── chat-store.ts
│   │   └── styles/
│   │       └── chat.css
│   └── shared/
│       ├── vscode-api.ts               # VS Code WebView API bridge
│       └── theme.ts                    # VS Code theme integration
├── resources/
│   ├── icons/
│   │   ├── locus.svg
│   │   ├── chat.svg
│   │   └── dashboard.svg
│   └── media/
│       └── loading.gif
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── cli.service.test.ts
│   │   └── session.service.test.ts
│   └── runTest.ts
├── .vscodeignore                       # Files to exclude from VSIX
├── package.json                        # Extension manifest
├── tsconfig.json                       # TypeScript config
├── esbuild.config.js                   # Build configuration
├── README.md                           # Marketplace README
├── CHANGELOG.md                        # Version history
└── icon.png                            # Extension icon
```

---

## 11. API & Communication Protocols

### 11.1 Extension ↔ WebView Protocol

**Message Types:**
```typescript
// Extension → WebView
type ExtensionMessage =
  | { type: 'stream_chunk'; data: StreamChunk }
  | { type: 'sessions_list'; data: Session[] }
  | { type: 'token'; token: string }
  | { type: 'theme_changed'; theme: 'light' | 'dark' }
  | { type: 'workspace_changed'; workspace: string };

// WebView → Extension
type WebViewMessage =
  | { type: 'send_message'; content: string }
  | { type: 'start_session'; options?: SessionOptions }
  | { type: 'stop_session' }
  | { type: 'list_sessions' }
  | { type: 'resume_session'; sessionId: string }
  | { type: 'get_token' }
  | { type: 'open_file'; filePath: string; line?: number }
  | { type: 'run_command'; command: string; args: any[] };
```

### 11.2 CLI Stream Protocol

**Stream Chunk Types (from CLI):**
```typescript
interface StreamChunk {
  type:
    | 'text_delta'      // Incremental text content
    | 'tool_use'        // Tool invocation start
    | 'tool_result'     // Tool execution result
    | 'thinking'        // Model thinking indicator
    | 'result'          // Final result
    | 'error';          // Error occurred

  content?: string;
  tool?: {
    name: string;
    input: Record<string, any>;
  };
  result?: {
    success: boolean;
    output?: string;
    error?: string;
  };
}
```

### 11.3 State Synchronization

```typescript
// Sync state between extension and WebViews
class StateSyncService {
  private state: Map<string, any> = new Map();
  private webviews: Set<vscode.Webview> = new Set();

  register(webview: vscode.Webview): void {
    this.webviews.add(webview);
    // Send current state to new WebView
    webview.postMessage({ type: 'state_sync', state: Object.fromEntries(this.state) });
  }

  update(key: string, value: any): void {
    this.state.set(key, value);
    // Broadcast to all WebViews
    for (const webview of this.webviews) {
      webview.postMessage({ type: 'state_update', key, value });
    }
  }
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// test/suite/cli.service.test.ts
import * as assert from 'assert';
import { CLIService } from '../../src/services/cli.service';

suite('CLIService', () => {
  let cliService: CLIService;

  setup(() => {
    cliService = new CLIService();
  });

  test('should emit chunks when receiving CLI output', (done) => {
    cliService.on('chunk', (chunk) => {
      assert.strictEqual(chunk.type, 'text_delta');
      done();
    });

    // Simulate CLI output
    cliService['handleOutput']('{"type":"text_delta","content":"Hello"}');
  });

  test('should handle session start/stop lifecycle', async () => {
    const sessionId = await cliService.startSession('/tmp/test-project');
    assert.ok(sessionId);

    await cliService.stopSession();
    // Verify process is terminated
  });
});
```

### 12.2 Integration Tests

```typescript
// test/suite/extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Integration', () => {
  test('should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('locus.openChat'));
    assert.ok(commands.includes('locus.openDashboard'));
    assert.ok(commands.includes('locus.newChat'));
  });

  test('should activate on Locus project', async () => {
    // Open workspace with .locus folder
    const extension = vscode.extensions.getExtension('locusai.locus');
    assert.ok(extension);

    await extension?.activate();
    assert.ok(extension?.isActive);
  });
});
```

### 12.3 E2E Tests with VS Code Test Runner

```typescript
// test/runTest.ts
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions', // Disable other extensions
        path.resolve(__dirname, '../../test-fixtures/sample-project')
      ]
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
```

---

## 13. Risks & Mitigations

### 13.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebView performance with large dashboards | High | Lazy load components, virtualize lists, use service workers |
| CLI subprocess stability | High | Implement reconnection logic, graceful error handling |
| Cross-platform path handling | Medium | Use VS Code URI APIs, normalize paths |
| VS Code API breaking changes | Medium | Pin VS Code engine version, test on insider builds |
| Authentication token expiry | Medium | Implement token refresh, prompt re-auth |

### 13.2 User Experience Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow initial load | High | Show loading states, preload critical assets |
| Theme inconsistency | Medium | Use VS Code theme variables, test both themes |
| Keyboard shortcut conflicts | Low | Make shortcuts configurable, follow conventions |

### 13.3 Security Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token leakage | Critical | Use SecretStorage, never log tokens |
| XSS in WebView | High | Strict CSP, sanitize all user input |
| Command injection via CLI | High | Validate and sanitize all inputs |
| Man-in-the-middle attacks | Medium | Enforce HTTPS, certificate pinning |

---

## Timeline Summary

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **Phase 1** | Foundation | Project setup, extension scaffold, configuration |
| **Phase 2** | Chat Interface | CLI integration, chat WebView, session management |
| **Phase 3** | Dashboard | WebView embedding, auth bridge, navigation |
| **Phase 4** | Integration | Commands, menus, keybindings, status bar |
| **Phase 5** | Distribution | Marketplace prep, CI/CD, telemetry, polish |

---

## Conclusion

This roadmap provides a comprehensive technical plan for building a VS Code extension that brings the full Locus experience into the code editor. The phased approach allows for incremental delivery while maintaining a clear path to the complete vision.

Key success factors:
1. **Leverage existing infrastructure** - Reuse CLI, SDK, and web components
2. **Prioritize the chat experience** - This is the primary use case
3. **Deep VS Code integration** - Make it feel native, not bolted-on
4. **Security first** - Handle authentication and sensitive data properly
5. **Performance matters** - Users expect instant responsiveness

The extension will transform Locus from a standalone tool into an integrated part of the developer's workflow, reducing context switching and increasing productivity.
