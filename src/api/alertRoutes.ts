import { Router } from "express";
import { AlertModel } from "../alerts/Alert.js";

export const alertRoutes = Router();

alertRoutes.get("/", async (_request, response) => {
  const alerts = await AlertModel.find().sort({ createdAt: -1 }).limit(100);
  response.json(alerts);
});
