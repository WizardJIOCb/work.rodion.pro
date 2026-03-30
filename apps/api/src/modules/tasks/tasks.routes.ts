import { and, asc, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { projects, taskStatusHistory, tasks } from "../../db/schema.js";
import { requireAuth } from "../../middleware/require-auth.js";

const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1),
  descriptionMd: z.string().default(""),
  status: z.enum(["todo", "doing", "blocked", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  kind: z.enum(["feature", "bug", "ops", "research", "idea", "content", "other"]).default("feature"),
  dueDate: z.string().datetime().nullable().optional(),
});

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/", async (request, response) => {
  const projectId = request.query.projectId?.toString();

  const baseQuery = db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      projectName: projects.name,
      title: tasks.title,
      descriptionMd: tasks.descriptionMd,
      status: tasks.status,
      priority: tasks.priority,
      kind: tasks.kind,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      closedAt: tasks.closedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId));

  const items = projectId
    ? await baseQuery.where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.updatedAt))
    : await baseQuery.orderBy(desc(tasks.updatedAt));

  response.json({ tasks: items });
});

tasksRouter.post("/", async (request, response) => {
  const parsed = taskSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid task payload." });
  }

  const [created] = await db
    .insert(tasks)
    .values({
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      closedAt: parsed.data.status === "done" ? new Date() : null,
    })
    .returning();

  await db.insert(taskStatusHistory).values({
    taskId: created.id,
    fromStatus: null,
    toStatus: created.status,
    note: "Task created",
  });

  return response.status(201).json({ task: created });
});

tasksRouter.put("/:id", async (request, response) => {
  const parsed = taskSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid task payload." });
  }

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, request.params.id)).limit(1);

  if (!existing) {
    return response.status(404).json({ message: "Task not found." });
  }

  const [updated] = await db
    .update(tasks)
    .set({
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      closedAt: parsed.data.status === "done" ? existing.closedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, request.params.id))
    .returning();

  if (existing.status !== updated.status) {
    await db.insert(taskStatusHistory).values({
      taskId: updated.id,
      fromStatus: existing.status,
      toStatus: updated.status,
      note: "Task updated",
    });
  }

  return response.json({ task: updated });
});

