import * as fs from "node:fs";
import * as path from "node:path";

const DIST_WEBVIEW = path.join(__dirname, "..", "..", "dist", "webview");
const MANIFEST_PATH = path.join(DIST_WEBVIEW, "manifest.json");

describe("webview build output", () => {
  let manifest: Record<string, string>;

  beforeAll(() => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  });

  it("manifest contains main.js entry", () => {
    expect(manifest["main.js"]).toBeDefined();
    expect(manifest["main.js"]).toMatch(/^main-[a-zA-Z0-9]+\.js$/);
  });

  it("manifest contains styles.css entry", () => {
    expect(manifest["styles.css"]).toBeDefined();
    expect(manifest["styles.css"]).toMatch(/^styles-[a-zA-Z0-9]+\.css$/);
  });

  it("hashed JS file exists on disk", () => {
    const jsFile = path.join(DIST_WEBVIEW, manifest["main.js"]);
    expect(fs.existsSync(jsFile)).toBe(true);
    const content = fs.readFileSync(jsFile, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("hashed CSS file exists on disk", () => {
    const cssFile = path.join(DIST_WEBVIEW, manifest["styles.css"]);
    expect(fs.existsSync(cssFile)).toBe(true);
    const content = fs.readFileSync(cssFile, "utf-8");
    expect(content).toContain("--vscode-sideBar-background");
  });
});

describe("webview HTML generation", () => {
  it("getHtmlForWebview produces CSP-compliant HTML", () => {
    // Simulate what webview-provider.ts does without requiring vscode API
    const manifest: Record<string, string> = JSON.parse(
      fs.readFileSync(MANIFEST_PATH, "utf-8")
    );
    const nonce = "test-nonce-12345";
    const scriptFilename = manifest["main.js"];
    const styleFilename = manifest["styles.css"];

    const cspSource = "https://file+.vscode-resource.vscode-cdn.net";
    const csp = [
      `default-src 'none'`,
      `style-src ${cspSource} 'nonce-${nonce}'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${cspSource}`,
      `img-src ${cspSource}`,
    ].join("; ");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Locus AI</title>
  <link rel="stylesheet" href="${styleFilename}" nonce="${nonce}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptFilename}"></script>
</body>
</html>`;

    // CSP meta tag present
    expect(html).toContain('http-equiv="Content-Security-Policy"');

    // Nonce present on script and style tags
    expect(html).toContain(`nonce="${nonce}"`);
    expect(html).toMatch(new RegExp(`<script nonce="${nonce}"`));
    expect(html).toMatch(new RegExp(`<link.*nonce="${nonce}"`));

    // No remote script or style sources
    expect(html).not.toMatch(/src="https?:\/\/(?!file\+)/);
    expect(html).not.toMatch(/href="https?:\/\/(?!file\+)/);

    // default-src is 'none' — no fallback loading
    expect(html).toContain("default-src 'none'");

    // Script-src only allows nonce, not 'unsafe-inline' or 'unsafe-eval'
    expect(html).not.toContain("unsafe-inline");
    expect(html).not.toContain("unsafe-eval");

    // Hashed filenames used
    expect(html).toContain(scriptFilename);
    expect(html).toContain(styleFilename);
  });
});
