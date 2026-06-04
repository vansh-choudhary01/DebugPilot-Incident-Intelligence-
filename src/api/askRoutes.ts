import { Router } from "express";
import { z } from "zod";
import { answerQuestion } from "../services/askService.js";

export const askRoutes = Router();

const askSchema = z.object({
  question: z.string().min(3)
});

askRoutes.post("/", async (request, response, next) => {
  try {
    const { question } = askSchema.parse(request.body);
    response.json(await answerQuestion(question));
  } catch (error) {
    next(error);
  }
});
