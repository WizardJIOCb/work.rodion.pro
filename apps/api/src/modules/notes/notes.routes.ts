import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { notes, projects } from "../../db/schema.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { slugify } from "../../utils/slug.js";

const noteSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  kind: z.enum(["note", "doc", "runbook", "meeting", "idea", "postmortem", "reference"]).default("note"),
  contentMd: z.string().default(""),
  isPinned: z.boolean().default(false),
});

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get("/", async (request, response) => {
  const projectId = request.query.projectId?.toString();

  const baseQuery = db
    .select({
      id: notes.id,
      projectId: notes.projectId,
      projectName: projects.name,
      title: notes.title,
      slug: notes.slug,
      kind: notes.kind,
      contentMd: notes.contentMd,
      isPinned: notes.isPinned,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .innerJoin(projects, eq(projects.id, notes.projectId));

  const items = projectId
    ? await baseQuery.where(eq(notes.projectId, projectId)).orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    : await baseQuery.orderBy(desc(notes.isPinned), desc(notes.updatedAt));

  response.json({ notes: items });
});

notesRouter.post("/", async (request, response) => {
  const parsed = noteSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid note payload." });
  }

  const [created] = await db
    .insert(notes)
    .values({
      ...parsed.data,
      slug: parsed.data.slug?.trim() || slugify(parsed.data.title),
    })
    .returning();

  return response.status(201).json({ note: created });
});

notesRouter.put("/:id", async (request, response) => {
  const parsed = noteSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid note payload." });
  }

  const [updated] = await db
    .update(notes)
    .set({
      ...parsed.data,
      slug: parsed.data.slug?.trim() || slugify(parsed.data.title),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, request.params.id))
    .returning();

  if (!updated) {
    return response.status(404).json({ message: "Note not found." });
  }

  return response.json({ note: updated });
});

