import * as fs from "node:fs";
import * as path from "node:path";
import {
  createErrorEvent,
  type HostEvent,
  ProtocolErrorCode,
  parseUIIntent,
} from "@locusai/shared";
import * as vscode from "vscode";
import type { ChatController } from "../../core/chat-controller";
import { getNonce } from "./get-nonce";

interface AssetManifest {
  [logicalName: string]: string;
}

export class LocusChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "locusai.chatView";

  private webviewView: vscode.WebviewView | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: ChatController
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    const webviewDistUri = vscode.Uri.joinPath(
      this.extensionUri,
      "dist",
      "webview"
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [webviewDistUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(
      webviewView.webview,
      webviewDistUri
    );

    // Bind the controller's event sink to forward HostEvents to webview.
    const postMessage = (event: HostEvent): void => {
      webviewView.webview.postMessage(event);
    };
    this.controller.setEventSink(postMessage);

    // Route inbound messages through schema validation → controller.
    webviewView.webview.onDidReceiveMessage((message: unknown) => {
      this.handleIncomingMessage(message);
    });

    // On webview dispose, clear the sink so events are not sent
    // to a stale webview. The controller stays alive.
    webviewView.onDidDispose(() => {
      this.webviewView = null;
      this.controller.setEventSink(null);
    });
  }

  /**
   * Validate and route an incoming message from the webview.
   * Invalid payloads emit a deterministic error event back.
   */
  private handleIncomingMessage(message: unknown): void {
    const result = parseUIIntent(message);

    if (!result.success) {
      const errorEvent = createErrorEvent(
        ProtocolErrorCode.MALFORMED_EVENT,
        "Invalid UIIntent payload",
        {
          details: result.error,
          recoverable: true,
        }
      );
      this.webviewView?.webview.postMessage(errorEvent);
      return;
    }

    this.controller.handleIntent(result.data);
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    webviewDistUri: vscode.Uri
  ): string {
    const manifest = this.readManifest(webviewDistUri);
    const nonce = getNonce();

    const scriptFilename = manifest["main.js"];
    const styleFilename = manifest["styles.css"];

    if (!scriptFilename) {
      return this.getErrorHtml(
        "Webview build assets not found. Run the extension build first."
      );
    }

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDistUri, scriptFilename)
    );
    const styleUri = styleFilename
      ? webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, styleFilename))
      : undefined;

    const cspSource = webview.cspSource;
    const csp = [
      `default-src 'none'`,
      `style-src ${cspSource} 'nonce-${nonce}'`,
      `script-src 'nonce-${nonce}' 'unsafe-eval'`,
      `font-src ${cspSource}`,
      `img-src ${cspSource}`,
    ].join("; ");

    const styleTag = styleUri
      ? `<link rel="stylesheet" href="${styleUri}" nonce="${nonce}">`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Locus AI</title>
  ${styleTag}
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private readManifest(webviewDistUri: vscode.Uri): AssetManifest {
    const manifestPath = path.join(webviewDistUri.fsPath, "manifest.json");
    try {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      return JSON.parse(raw) as AssetManifest;
    } catch {
      return {};
    }
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'">
  <title>Locus AI</title>
</head>
<body>
  <p style="color:var(--vscode-errorForeground);padding:16px;">${message}</p>
</body>
</html>`;
  }
}
