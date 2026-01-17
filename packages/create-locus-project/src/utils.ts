import { mkdir, writeFile } from "node:fs/promises";

export async function writeJson(
  path: string,
  content: Record<string, unknown> | unknown[]
) {
  const jsonContent = `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(path, jsonContent);
}

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}
