import { asc, count, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { notes, projects, tasks } from "../../db/schema.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { slugify } from "../../utils/slug.js";

const projectSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  description: z.string().default(""),
  color: z.string().default("#4d8eff"),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  repoUrl: z.string().default(""),
  siteUrl: z.string().default(""),
  docsUrl: z.string().default(""),
  localPath: z.string().default(""),
  serverPath: z.string().default(""),
  notes: z.string().default(""),
});

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get("/", async (_request, response) => {
  const items = await db.select().from(projects).orderBy(asc(projects.name));
  response.json({ projects: items });
});

projectsRouter.post("/", async (request, response) => {
  const parsed = projectSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid project payload." });
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);

  const [created] = await db
    .insert(projects)
    .values({
      ...parsed.data,
      slug,
    })
    .returning();

  return response.status(201).json({ project: created });
});

projectsRouter.put("/:id", async (request, response) => {
  const parsed = projectSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid project payload." });
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);

  const [updated] = await db
    .update(projects)
    .set({
      ...parsed.data,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, request.params.id))
    .returning();

  if (!updated) {
    return response.status(404).json({ message: "Project not found." });
  }

  return response.json({ project: updated });
});

projectsRouter.get("/:slug", async (request, response) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, request.params.slug)).limit(1);

  if (!project) {
    return response.status(404).json({ message: "Project not found." });
  }

  const [taskMetrics] = await db
    .select({ total: count() })
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const [noteMetrics] = await db
    .select({ total: count() })
    .from(notes)
    .where(eq(notes.projectId, project.id));

  const taskItems = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id))
    .orderBy(desc(tasks.updatedAt));

  const noteItems = await db
    .select()
    .from(notes)
    .where(eq(notes.projectId, project.id))
    .orderBy(desc(notes.updatedAt));

  return response.json({
    project,
    stats: {
      tasks: taskMetrics?.total ?? 0,
      notes: noteMetrics?.total ?? 0,
    },
    tasks: taskItems,
    notes: noteItems,
  });
});

