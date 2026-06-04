import path from "node:path";
import fs from "node:fs/promises";
import { simpleGit } from "simple-git";
import { env } from "../config/env.js";

function repoNameFromUrl(url: string) {
  const clean = url.replace(/\.git$/, "").split("/").filter(Boolean).pop() ?? "repository";
  return clean.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
}

export async function cloneRepository(url: string) {
  await fs.mkdir(env.repositoryBasePath, { recursive: true });

  const name = repoNameFromUrl(url);
  const localPath = path.resolve(env.repositoryBasePath, name);
  const git = simpleGit();

  try {
    await fs.access(path.join(localPath, ".git"));
    return { name, localPath, cloned: false };
  } catch {
    await git.clone(url, localPath, ["--depth", "1"]);
    return { name, localPath, cloned: true };
  }
}
