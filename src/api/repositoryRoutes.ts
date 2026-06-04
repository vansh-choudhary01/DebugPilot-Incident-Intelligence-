import { Router } from "express";
import { z } from "zod";
import { RepositoryModel } from "../repositories/Repository.js";
import { CodeChunkModel } from "../embeddings/CodeChunk.js";
import { indexRepository } from "../services/repositoryIndexer.js";

export const repositoryRoutes = Router();

const repositorySchema = z.object({
  url: z.string().url()
});

repositoryRoutes.get("/", async (_request, response) => {
  const repositories = await RepositoryModel.find().sort({ createdAt: -1 });
  const result = await Promise.all(
    repositories.map(async (repo) => ({
      ...repo.toObject(),
      codeChunkCount: await CodeChunkModel.countDocuments({ repoId: repo._id })
    }))
  );
  response.json(result);
});

repositoryRoutes.post("/", async (request, response, next) => {
  try {
    const { url } = repositorySchema.parse(request.body);
    const repo = await indexRepository(url);
    response.status(201).json(repo);
  } catch (error) {
    next(error);
  }
});

repositoryRoutes.post("/:id/reindex", async (request, response, next) => {
  try {
    const repo = await RepositoryModel.findById(request.params.id);

    if (!repo) {
      response.status(404).json({ error: "Repository not found" });
      return;
    }

    const indexed = await indexRepository(repo.url, true);
    response.json(indexed);
  } catch (error) {
    next(error);
  }
});
