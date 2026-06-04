import fs from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "vendor"
]);

const indexedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".py",
  ".go",
  ".java",
  ".cs",
  ".rb",
  ".php",
  ".yml",
  ".yaml"
]);

export async function listCodeFiles(rootPath: string) {
  const files: string[] = [];

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }

      if (entry.isFile() && indexedExtensions.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  await walk(rootPath);
  return files;
}

export function chunkCode(content: string, maxLines = 80) {
  const lines = content.split(/\r?\n/);
  const chunks: string[] = [];

  for (let index = 0; index < lines.length; index += maxLines) {
    chunks.push(lines.slice(index, index + maxLines).join("\n"));
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}
