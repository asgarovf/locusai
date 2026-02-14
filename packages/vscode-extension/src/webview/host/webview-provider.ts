import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { getNonce } from "./get-nonce";

interface AssetManifest {
  [logicalName: string]: string;
}

export class LocusChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "locusai.chatView";

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
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

    webviewView.webview.onDidReceiveMessage((message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "webview_ready"
      ) {
        // Webview confirmed it loaded — future host→webview events can begin
      }
    });
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
      `script-src 'nonce-${nonce}'`,
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
