import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { env } from "../config/env.js";

const openai = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : undefined;
const gemini = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : undefined;

export async function generateText(prompt: string) {
  if (env.aiProvider === "openai" && openai) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    return response.choices[0].message.content ?? "";
  }

  if (env.aiProvider === "gemini" && gemini) {
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(prompt);
    return response.response.text();
  }

  return JSON.stringify({
    whatHappened: "Repeated errors were detected for the same service and failure fingerprint.",
    likelyRootCause: "The logs point to a recurring dependency or code-path failure. Configure an AI provider for deeper analysis.",
    filesToInspect: [],
    suggestedFixes: [
      "Inspect the first failing log and surrounding deploy changes.",
      "Check service dependencies named in the error message.",
      "Reproduce the failing request path locally."
    ],
    confidenceScore: 0.45
  });
}
