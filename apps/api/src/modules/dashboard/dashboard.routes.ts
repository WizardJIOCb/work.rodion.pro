import { count, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { db } from "../../db/client.js";
import { notes, projects, tasks } from "../../db/schema.js";
import { requireAuth } from "../../middleware/require-auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, async (_request, response) => {
  const [projectCount] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.status, "active"));

  const [taskCount] = await db
    .select({ total: count() })
    .from(tasks)
    .where(inArray(tasks.status, ["todo", "doing", "blocked"]));

  const [noteCount] = await db
    .select({ total: count() })
    .from(notes)
    .where(eq(notes.isPinned, true));

  const recentProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(3);
  const recentTasks = await db.select().from(tasks).orderBy(desc(tasks.updatedAt)).limit(3);
  const recentNotes = await db.select().from(notes).orderBy(desc(notes.updatedAt)).limit(3);

  response.json({
    summary: {
      activeProjects: projectCount?.total ?? 0,
      openTasks: taskCount?.total ?? 0,
      pinnedNotes: noteCount?.total ?? 0,
      llmSessionsToday: 0,
    },
    highlights: [
      recentProjects[0]?.name ? `Latest project: ${recentProjects[0].name}` : "No projects yet.",
      recentTasks[0]?.title ? `Latest task: ${recentTasks[0].title}` : "No tasks yet.",
      recentNotes[0]?.title ? `Latest note: ${recentNotes[0].title}` : "No notes yet.",
    ],
  });
});
