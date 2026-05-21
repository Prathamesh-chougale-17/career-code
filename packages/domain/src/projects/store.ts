import type { Collection, Document, Filter } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { getProfileSnapshot } from "@careeright/domain/profile/store";
import type { ProfileItem } from "@careeright/domain/profile/schema";
import {
  createProjectAttributeInputSchema,
  createProjectInputSchema,
  createProjectNoteInputSchema,
  createProjectResourceInputSchema,
  deleteProjectAttributeInputSchema,
  deleteProjectNoteInputSchema,
  deleteProjectResourceInputSchema,
  projectAttributeSchema,
  projectDetailSchema,
  projectImportResultSchema,
  projectListSchema,
  projectNoteListSchema,
  projectNoteSchema,
  projectResourceSchema,
  projectSchema,
  projectsSummarySchema,
  projectIdInputSchema,
  reorderProjectNotesInputSchema,
  syncFromProfileProjectInputSchema,
  updateProjectAttributeInputSchema,
  updateProjectInputSchema,
  updateProjectNoteInputSchema,
  updateProjectResourceInputSchema,
  type CreateProjectAttributeInput,
  type CreateProjectInput,
  type CreateProjectNoteInput,
  type CreateProjectResourceInput,
  type Project,
  type ProjectAttribute,
  type ProjectImportResult,
  type ProjectNote,
  type ProjectResource,
  type ProjectsSummary,
  type ReorderProjectNotesInput,
  type UpdateProjectAttributeInput,
  type UpdateProjectInput,
  type UpdateProjectNoteInput,
  type UpdateProjectResourceInput,
} from "@careeright/domain/projects/schema";

type ProjectsMemoryState = {
  projects: Project[];
  notes: ProjectNote[];
};

type ProjectsCollections = {
  projects: Collection<Project>;
  notes: Collection<ProjectNote>;
};

const globalForProjects = globalThis as typeof globalThis & {
  __careerightProjectsMemoryState?: ProjectsMemoryState;
};

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function withoutMongoId<T extends Document>(doc: T): Omit<T, "_id"> {
  const { _id: _id, ...rest } = doc;
  void _id;
  return rest;
}

function memoryState(): ProjectsMemoryState {
  if (!globalForProjects.__careerightProjectsMemoryState) {
    globalForProjects.__careerightProjectsMemoryState = {
      projects: [],
      notes: [],
    };
  }

  return globalForProjects.__careerightProjectsMemoryState;
}

async function collections(): Promise<ProjectsCollections> {
  const db = await getMongoDb();

  return {
    projects: db.collection<Project>("projects"),
    notes: db.collection<ProjectNote>("projectNotes"),
  };
}

function activeProjectFilter(userId: string): Filter<Project> {
  return {
    userId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  } as Filter<Project>;
}

function projectFilter(projectId: string, userId: string): Filter<Project> {
  return {
    id: projectId,
    ...activeProjectFilter(userId),
  };
}

function sortProjects(projects: Project[]) {
  return [...projects].sort((left, right) => {
    const updatedSort = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedSort !== 0) {
      return updatedSort;
    }

    return left.title.localeCompare(right.title);
  });
}

function sortNotes(notes: ProjectNote[]) {
  return [...notes].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const item = value.trim();
    const key = item.toLowerCase();

    if (!item || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(item);
  }

  return normalized;
}

function normalizeAttributeAliases(label: string, aliases: string[]) {
  const labelKey = label.trim().toLowerCase();

  return normalizeList(aliases).filter(
    (alias) => alias.toLowerCase() !== labelKey,
  );
}

function profileDateText(item: ProfileItem) {
  if (item.startDate && item.endDate) {
    return `${item.startDate} - ${item.endDate}`;
  }

  return item.startDate || item.endDate || "";
}

function profileOverviewMarkdown(item: ProfileItem, project: Project) {
  const lines = [`# ${project.title}`, ""];

  if (project.summary) {
    lines.push(project.summary, "");
  }

  if (project.techStack.length > 0) {
    lines.push("## Tech stack", "");
    lines.push(...project.techStack.map((tag) => `- ${tag}`), "");
  }

  if (project.dateText) {
    lines.push("## Timeline", "", project.dateText, "");
  }

  if (item.url) {
    lines.push("## Reference", "", `[Open project](${item.url})`, "");
  }

  return lines.join("\n").trim();
}

function createProjectRecord(
  input: CreateProjectInput,
  userId: string,
  createdAt = now(),
) {
  const parsed = createProjectInputSchema.parse(input);

  return projectSchema.parse({
    ...parsed,
    techStack: normalizeList(parsed.techStack),
    id: id("project"),
    userId,
    resources: [],
    attributes: [],
    createdAt,
    updatedAt: createdAt,
  });
}

function createProjectNoteRecord(
  input: CreateProjectNoteInput,
  userId: string,
  order: number,
  createdAt = now(),
) {
  const parsed = createProjectNoteInputSchema.parse(input);

  return projectNoteSchema.parse({
    ...parsed,
    id: id("project-note"),
    userId,
    order,
    createdAt,
    updatedAt: createdAt,
  });
}

function createResourceRecord(
  input: Omit<CreateProjectResourceInput, "projectId">,
  createdAt = now(),
) {
  const parsed = createProjectResourceInputSchema
    .omit({ projectId: true })
    .parse(input);

  return projectResourceSchema.parse({
    ...parsed,
    id: id("project-resource"),
    createdAt,
    updatedAt: createdAt,
  });
}

function createAttributeRecord(
  input: Omit<CreateProjectAttributeInput, "projectId">,
  createdAt = now(),
) {
  const parsed = createProjectAttributeInputSchema
    .omit({ projectId: true })
    .parse(input);

  return projectAttributeSchema.parse({
    ...parsed,
    aliases: normalizeAttributeAliases(parsed.label, parsed.aliases),
    resourceIds: normalizeList(parsed.resourceIds),
    id: id("project-attribute"),
    createdAt,
    updatedAt: createdAt,
  });
}

function projectFromProfileItem(item: ProfileItem, userId: string) {
  const createdAt = now();
  const resources: ProjectResource[] = item.url
    ? [
        createResourceRecord(
          {
            title: "Resume project link",
            url: item.url,
            type: "link",
            note: "Imported from the resume profile project.",
          },
          createdAt,
        ),
      ]
    : [];
  const attributes: ProjectAttribute[] = normalizeList(item.tags).map((tag) =>
    createAttributeRecord(
      {
        label: tag,
        aliases: [],
        type: "technology",
        dateValue: "",
        description: `Imported from the ${item.title} resume project tech stack.`,
        resourceIds: [],
      },
      createdAt,
    ),
  );
  const project = projectSchema.parse({
    id: id("project"),
    userId,
    title: item.title,
    summary: item.description,
    techStack: normalizeList(item.tags),
    status: "active",
    dateText: profileDateText(item),
    sourceProfileItemId: item.id,
    sourceProfileUpdatedAt: item.updatedAt,
    resources,
    attributes,
    createdAt,
    updatedAt: createdAt,
  });
  const note = projectNoteSchema.parse({
    id: id("project-note"),
    userId,
    projectId: project.id,
    title: "Resume overview",
    content: profileOverviewMarkdown(item, project),
    order: 0,
    createdAt,
    updatedAt: createdAt,
  });

  return { project, note };
}

async function saveProject(project: Project) {
  if (isMongoConfigured()) {
    const { projects } = await collections();
    await projects.updateOne({ id: project.id }, { $set: project }, { upsert: true });
    return project;
  }

  const memory = memoryState();
  const index = memory.projects.findIndex((item) => item.id === project.id);

  if (index === -1) {
    memory.projects.push(project);
  } else {
    memory.projects[index] = project;
  }

  return project;
}

async function saveNotes(notes: ProjectNote[]) {
  if (notes.length === 0) {
    return;
  }

  if (isMongoConfigured()) {
    const { notes: notesCollection } = await collections();
    await notesCollection.bulkWrite(
      notes.map((note) => ({
        updateOne: {
          filter: { id: note.id },
          update: { $set: note },
          upsert: true,
        },
      })),
    );
    return;
  }

  const memory = memoryState();

  for (const note of notes) {
    const index = memory.notes.findIndex((item) => item.id === note.id);

    if (index === -1) {
      memory.notes.push(note);
    } else {
      memory.notes[index] = note;
    }
  }
}

async function readProject(projectId: string, userId: string) {
  if (isMongoConfigured()) {
    const { projects } = await collections();
    const project = await projects.findOne(projectFilter(projectId, userId));

    return project ? projectSchema.parse(withoutMongoId(project)) : null;
  }

  return (
    memoryState().projects.find(
      (project) =>
        project.id === projectId && project.userId === userId && !project.deletedAt,
    ) ?? null
  );
}

async function requireProject(projectId: string, userId: string) {
  const project = await readProject(projectId, userId);

  if (!project) {
    throw new Error("Project not found.");
  }

  return project;
}

async function readNotes(projectId: string, userId: string) {
  if (isMongoConfigured()) {
    const { notes } = await collections();
    const docs = await notes.find({ projectId, userId }).sort({ order: 1 }).toArray();

    return projectNoteListSchema.parse(docs.map(withoutMongoId));
  }

  return projectNoteListSchema.parse(
    sortNotes(
      memoryState().notes.filter(
        (note) => note.projectId === projectId && note.userId === userId,
      ),
    ),
  );
}

async function nextNoteOrder(projectId: string, userId: string) {
  if (isMongoConfigured()) {
    const { notes } = await collections();
    return notes.countDocuments({ projectId, userId });
  }

  return memoryState().notes.filter(
    (note) => note.projectId === projectId && note.userId === userId,
  ).length;
}

async function requireNote(noteId: string, userId: string) {
  if (isMongoConfigured()) {
    const { notes } = await collections();
    const note = await notes.findOne({ id: noteId, userId });

    if (note) {
      return projectNoteSchema.parse(withoutMongoId(note));
    }
  } else {
    const note = memoryState().notes.find(
      (item) => item.id === noteId && item.userId === userId,
    );

    if (note) {
      return note;
    }
  }

  throw new Error("Project note not found.");
}

function ensureResourceIds(project: Project, resourceIds: string[]) {
  const existing = new Set(project.resources.map((resource) => resource.id));
  const invalid = resourceIds.find((resourceId) => !existing.has(resourceId));

  if (invalid) {
    throw new Error(`Project resource ${invalid} was not found.`);
  }
}

export async function getProjectsSummary(userId: string) {
  const [projects, profile] = await Promise.all([
    listProjects(userId),
    getProfileSnapshot(userId),
  ]);
  const linkedProfileItemIds = new Set(
    projects
      .map((project) => project.sourceProfileItemId)
      .filter((value): value is string => Boolean(value)),
  );
  const profileProjectItems = profile.items.filter((item) => item.type === "project");
  const summary: ProjectsSummary = {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status !== "archived").length,
    archivedProjects: projects.filter((project) => project.status === "archived").length,
    linkedProfileProjects: linkedProfileItemIds.size,
    unlinkedProfileProjects: profileProjectItems.filter(
      (item) => !linkedProfileItemIds.has(item.id),
    ).length,
    resourceCount: projects.reduce(
      (count, project) => count + project.resources.length,
      0,
    ),
    attributeCount: projects.reduce(
      (count, project) => count + project.attributes.length,
      0,
    ),
    noteCount: (
      await Promise.all(
        projects.map((project) => readNotes(project.id, userId)),
      )
    ).reduce((count, notes) => count + notes.length, 0),
    updatedAt: projects[0]?.updatedAt ?? null,
  };

  return projectsSummarySchema.parse(summary);
}

export async function listProjects(userId: string) {
  if (isMongoConfigured()) {
    const { projects } = await collections();
    const docs = await projects
      .find(activeProjectFilter(userId))
      .sort({ updatedAt: -1, title: 1 })
      .toArray();

    return projectListSchema.parse(docs.map(withoutMongoId));
  }

  return projectListSchema.parse(
    sortProjects(
      memoryState().projects.filter(
        (project) => project.userId === userId && !project.deletedAt,
      ),
    ),
  );
}

export async function getProject(input: unknown, userId: string) {
  const { projectId } = projectIdInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const notes = await readNotes(projectId, userId);

  return projectDetailSchema.parse({ project, notes });
}

export async function createProject(input: CreateProjectInput, userId: string) {
  const project = createProjectRecord(input, userId);

  await saveProject(project);
  return project;
}

export async function updateProject(input: UpdateProjectInput, userId: string) {
  const { projectId, patch } = updateProjectInputSchema.parse(input);
  const current = await requireProject(projectId, userId);
  const updatedAt = now();
  const project = projectSchema.parse({
    ...current,
    ...patch,
    techStack: patch.techStack ? normalizeList(patch.techStack) : current.techStack,
    archivedAt:
      patch.status === "archived" ? current.archivedAt ?? updatedAt : current.archivedAt,
    updatedAt,
  });

  return saveProject(project);
}

export async function archiveProject(input: unknown, userId: string) {
  const { projectId } = projectIdInputSchema.parse(input);
  const current = await requireProject(projectId, userId);
  const updatedAt = now();
  const project = projectSchema.parse({
    ...current,
    status: "archived",
    archivedAt: current.archivedAt ?? updatedAt,
    updatedAt,
  });

  return saveProject(project);
}

export async function deleteProject(input: unknown, userId: string) {
  const { projectId } = projectIdInputSchema.parse(input);
  const current = await requireProject(projectId, userId);
  const updatedAt = now();
  const project = projectSchema.parse({
    ...current,
    status: "archived",
    archivedAt: current.archivedAt ?? updatedAt,
    deletedAt: updatedAt,
    updatedAt,
  });

  return saveProject(project);
}

export async function importFromProfileProjects(userId: string) {
  const [profile, projects] = await Promise.all([
    getProfileSnapshot(userId),
    listProjects(userId),
  ]);
  const linkedProfileItemIds = new Set(
    projects
      .map((project) => project.sourceProfileItemId)
      .filter((value): value is string => Boolean(value)),
  );
  const profileProjectItems = profile.items.filter((item) => item.type === "project");
  const created: Project[] = [];
  const notes: ProjectNote[] = [];

  for (const item of profileProjectItems) {
    if (linkedProfileItemIds.has(item.id)) {
      continue;
    }

    const record = projectFromProfileItem(item, userId);
    created.push(record.project);
    notes.push(record.note);
    linkedProfileItemIds.add(item.id);
  }

  if (isMongoConfigured() && created.length > 0) {
    const { projects: projectCollection, notes: noteCollection } = await collections();
    await Promise.all([
      projectCollection.insertMany(created.map((project) => ({ ...project }))),
      noteCollection.insertMany(notes.map((note) => ({ ...note }))),
    ]);
  } else if (created.length > 0) {
    const memory = memoryState();
    memory.projects.push(...created);
    memory.notes.push(...notes);
  }

  const result: ProjectImportResult = {
    created,
    skipped: profileProjectItems.length - created.length,
  };

  return projectImportResultSchema.parse(result);
}

export async function syncFromProfileProject(input: unknown, userId: string) {
  const { projectId } = syncFromProfileProjectInputSchema.parse(input);
  const current = await requireProject(projectId, userId);

  if (!current.sourceProfileItemId) {
    throw new Error("Project is not linked to a resume profile project.");
  }

  const profile = await getProfileSnapshot(userId);
  const source = profile.items.find(
    (item) => item.id === current.sourceProfileItemId && item.type === "project",
  );

  if (!source) {
    throw new Error("Linked resume profile project was not found.");
  }

  const updatedAt = now();
  const project = projectSchema.parse({
    ...current,
    title: source.title,
    summary: source.description,
    techStack: normalizeList(source.tags),
    dateText: profileDateText(source),
    sourceProfileUpdatedAt: source.updatedAt,
    updatedAt,
  });

  return saveProject(project);
}

export async function createNote(input: CreateProjectNoteInput, userId: string) {
  const parsed = createProjectNoteInputSchema.parse(input);
  await requireProject(parsed.projectId, userId);
  const note = createProjectNoteRecord(
    parsed,
    userId,
    await nextNoteOrder(parsed.projectId, userId),
  );

  await saveNotes([note]);
  return note;
}

export async function updateNote(input: UpdateProjectNoteInput, userId: string) {
  const { noteId, patch } = updateProjectNoteInputSchema.parse(input);
  const current = await requireNote(noteId, userId);
  await requireProject(current.projectId, userId);
  const note = projectNoteSchema.parse({
    ...current,
    ...patch,
    updatedAt: now(),
  });

  await saveNotes([note]);
  return note;
}

export async function deleteNote(input: unknown, userId: string) {
  const { noteId } = deleteProjectNoteInputSchema.parse(input);
  const note = await requireNote(noteId, userId);
  await requireProject(note.projectId, userId);

  if (isMongoConfigured()) {
    const { notes } = await collections();
    await notes.deleteOne({ id: noteId, userId });
  } else {
    const memory = memoryState();
    memory.notes = memory.notes.filter(
      (item) => !(item.id === noteId && item.userId === userId),
    );
  }

  return note;
}

export async function reorderNotes(
  input: ReorderProjectNotesInput,
  userId: string,
) {
  const { projectId, noteIds } = reorderProjectNotesInputSchema.parse(input);
  await requireProject(projectId, userId);
  const currentNotes = await readNotes(projectId, userId);
  const currentIds = currentNotes.map((note) => note.id).sort();
  const nextIds = [...noteIds].sort();

  if (
    currentIds.length !== nextIds.length ||
    currentIds.some((noteId, index) => noteId !== nextIds[index])
  ) {
    throw new Error("Note order must include every project note exactly once.");
  }

  const updatedAt = now();
  const noteById = new Map(currentNotes.map((note) => [note.id, note]));
  const nextNotes = noteIds.map((noteId, order) =>
    projectNoteSchema.parse({
      ...noteById.get(noteId),
      order,
      updatedAt,
    }),
  );

  await saveNotes(nextNotes);
  return projectNoteListSchema.parse(nextNotes);
}

export async function createResource(
  input: CreateProjectResourceInput,
  userId: string,
) {
  const { projectId, ...resourceInput } =
    createProjectResourceInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const resource = createResourceRecord(resourceInput);
  const updated = projectSchema.parse({
    ...project,
    resources: [...project.resources, resource],
    updatedAt: now(),
  });

  await saveProject(updated);
  return resource;
}

export async function updateResource(
  input: UpdateProjectResourceInput,
  userId: string,
) {
  const { projectId, resourceId, patch } =
    updateProjectResourceInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const current = project.resources.find((resource) => resource.id === resourceId);

  if (!current) {
    throw new Error("Project resource not found.");
  }

  const resource = projectResourceSchema.parse({
    ...current,
    ...patch,
    updatedAt: now(),
  });
  const updated = projectSchema.parse({
    ...project,
    resources: project.resources.map((item) =>
      item.id === resourceId ? resource : item,
    ),
    updatedAt: now(),
  });

  await saveProject(updated);
  return resource;
}

export async function deleteResource(input: unknown, userId: string) {
  const { projectId, resourceId } =
    deleteProjectResourceInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const resource = project.resources.find((item) => item.id === resourceId);

  if (!resource) {
    throw new Error("Project resource not found.");
  }

  const updated = projectSchema.parse({
    ...project,
    resources: project.resources.filter((item) => item.id !== resourceId),
    attributes: project.attributes.map((attribute) => ({
      ...attribute,
      resourceIds: attribute.resourceIds.filter((id) => id !== resourceId),
    })),
    updatedAt: now(),
  });

  await saveProject(updated);
  return resource;
}

export async function createAttribute(
  input: CreateProjectAttributeInput,
  userId: string,
) {
  const { projectId, ...attributeInput } =
    createProjectAttributeInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  ensureResourceIds(project, attributeInput.resourceIds);
  const attribute = createAttributeRecord(attributeInput);
  const updated = projectSchema.parse({
    ...project,
    attributes: [...project.attributes, attribute],
    updatedAt: now(),
  });

  await saveProject(updated);
  return attribute;
}

export async function updateAttribute(
  input: UpdateProjectAttributeInput,
  userId: string,
) {
  const { projectId, attributeId, patch } =
    updateProjectAttributeInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const current = project.attributes.find(
    (attribute) => attribute.id === attributeId,
  );

  if (!current) {
    throw new Error("Project attribute not found.");
  }

  const resourceIds = patch.resourceIds ?? current.resourceIds;
  ensureResourceIds(project, resourceIds);
  const label = patch.label ?? current.label;
  const attribute = projectAttributeSchema.parse({
    ...current,
    ...patch,
    label,
    aliases: normalizeAttributeAliases(label, patch.aliases ?? current.aliases),
    resourceIds: normalizeList(resourceIds),
    updatedAt: now(),
  });
  const updated = projectSchema.parse({
    ...project,
    attributes: project.attributes.map((item) =>
      item.id === attributeId ? attribute : item,
    ),
    updatedAt: now(),
  });

  await saveProject(updated);
  return attribute;
}

export async function deleteAttribute(input: unknown, userId: string) {
  const { projectId, attributeId } =
    deleteProjectAttributeInputSchema.parse(input);
  const project = await requireProject(projectId, userId);
  const attribute = project.attributes.find((item) => item.id === attributeId);

  if (!attribute) {
    throw new Error("Project attribute not found.");
  }

  const updated = projectSchema.parse({
    ...project,
    attributes: project.attributes.filter((item) => item.id !== attributeId),
    updatedAt: now(),
  });

  await saveProject(updated);
  return attribute;
}
