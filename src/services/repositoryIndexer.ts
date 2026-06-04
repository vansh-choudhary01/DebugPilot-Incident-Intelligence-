import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { CodeChunkModel } from "../embeddings/CodeChunk.js";
import { createEmbedding } from "../embeddings/embeddingService.js";
import { cloneRepository } from "../github/gitService.js";
import { chunkCode, listCodeFiles } from "../github/codeScanner.js";
import { RepositoryModel } from "../repositories/Repository.js";

export async function indexRepository(url: string, force = false) {
  let repo = await RepositoryModel.findOne({ url });

  if (repo?.status === "indexed" && !force) {
    return repo;
  }

  const cloned = await cloneRepository(url);

  if (!repo) {
    repo = await RepositoryModel.create({
      url,
      name: cloned.name,
      localPath: cloned.localPath,
      status: "pending"
    });
  }

  repo.status = "pending";
  repo.lastError = undefined;
  await repo.save();

  try {
    if (force) {
      await CodeChunkModel.deleteMany({ repoId: repo._id });
    }

    const files = await listCodeFiles(repo.localPath);
    let chunkCount = 0;

    for (const absoluteFilePath of files) {
      const relativePath = path.relative(repo.localPath, absoluteFilePath);
      const content = await fs.readFile(absoluteFilePath, "utf8");
      const chunks = chunkCode(content);

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const chunk = chunks[chunkIndex];
        const embedding = await createEmbedding(`${relativePath}\n${chunk}`);

        await CodeChunkModel.updateOne(
          { repoId: repo._id, filePath: relativePath, chunkIndex },
          { $set: { content: chunk, embedding } },
          { upsert: true }
        );
        chunkCount += 1;
      }
    }

    repo.status = "indexed";
    repo.indexedAt = new Date();
    await repo.save();
    console.log(`[debugpilot] indexed ${chunkCount} chunks from ${repo.name}`);
    return repo;
  } catch (error) {
    repo.status = "failed";
    repo.lastError = error instanceof Error ? error.message : "Unknown indexing error";
    await repo.save();
    throw error;
  }
}

export async function getLatestRepositoryId() {
  const repo = await RepositoryModel.findOne({ status: "indexed" }).sort({ indexedAt: -1 });
  return repo?._id as mongoose.Types.ObjectId | undefined;
}

function normalizedTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && term !== "service");
}

export async function getRepositoryIdForService(service: string) {
  const terms = normalizedTerms(service);

  if (terms.length === 0) {
    return getLatestRepositoryId();
  }

  const repositories = await RepositoryModel.find({ status: "indexed" }).sort({ indexedAt: -1 });
  const matchingRepository = repositories.find((repo) => {
    const searchable = `${repo.name} ${repo.url} ${repo.localPath}`.toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });

  return (matchingRepository?._id ?? repositories[0]?._id) as mongoose.Types.ObjectId | undefined;
}
