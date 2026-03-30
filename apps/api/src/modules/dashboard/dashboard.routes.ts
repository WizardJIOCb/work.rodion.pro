import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, (_request, response) => {
  response.json({
    summary: {
      activeProjects: 0,
      openTasks: 0,
      pinnedNotes: 0,
      llmSessionsToday: 0,
    },
    highlights: [
      "Stage 1 foundation is active.",
      "Local admin auth is enabled.",
      "Database migrations can now initialize the platform tables.",
    ],
  });
});

