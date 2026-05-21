import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  createProject,
  createAttribute,
  createNote,
  createResource,
  getProject,
  importFromProfileProjects,
  listProjects,
  reorderNotes,
  syncFromProfileProject,
} from "@careeright/domain/projects/store";
import {
  createProfileItem,
  updateProfileItem,
} from "@careeright/domain/profile/store";

process.env.MONGODB_URI = "";

function userId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

describe("projects dashboard wiring", () => {
  test("dashboard route and sidebar expose projects", () => {
    const page = readFileSync("app/dashboard/projects/page.tsx", "utf8");
    const sidebar = readFileSync(
      "../../packages/ui/src/components/dashboard-sidebar.tsx",
      "utf8",
    );
    const provider = readFileSync(
      "components/providers/dashboard-providers.tsx",
      "utf8",
    );
    const desktopApp = readFileSync("../desktop/src/App.tsx", "utf8");

    expect(page).toContain("ProjectsApp");
    expect(page).toContain('requirePageSession("/dashboard/projects")');
    expect(sidebar).toContain('href="/dashboard/projects"');
    expect(sidebar).toContain('route="projects"');
    expect(provider).toContain('pathname.startsWith("/dashboard/projects")');
    expect(desktopApp).toContain('route === "projects"');
  });
});

describe("project workspaces", () => {
  test("imports resume projects once and syncs metadata without overwriting notes", async () => {
    const ownerId = userId("project-import-owner");
    const profileProject = await createProfileItem(
      {
        type: "project",
        title: "Kafka Job Pipeline",
        description: "A ranked job seeding and application workflow.",
        startDate: "Jan 2026",
        endDate: "Present",
        url: "https://example.com/kafka-pipeline",
        tags: ["Kafka", "Node.js", "MongoDB"],
      },
      ownerId,
    );

    const firstImport = await importFromProfileProjects(ownerId);
    const secondImport = await importFromProfileProjects(ownerId);
    const importedProject = firstImport.created[0];

    expect(firstImport.created).toHaveLength(1);
    expect(secondImport.created).toHaveLength(0);
    expect(secondImport.skipped).toBe(1);
    expect(importedProject).toMatchObject({
      title: "Kafka Job Pipeline",
      sourceProfileItemId: profileProject.id,
      techStack: ["Kafka", "Node.js", "MongoDB"],
      dateText: "Jan 2026 - Present",
    });

    const detail = await getProject({ projectId: importedProject!.id }, ownerId);
    const overview = detail.notes[0];

    expect(detail.project.resources[0]?.url).toBe(
      "https://example.com/kafka-pipeline",
    );
    expect(detail.project.attributes.map((attribute) => attribute.label)).toEqual(
      ["Kafka", "Node.js", "MongoDB"],
    );
    expect(overview?.content).toContain("Kafka Job Pipeline");

    await createNote(
      {
        projectId: importedProject!.id,
        title: "Interview story",
        content: "Kafka made the event pipeline easier to explain.",
      },
      ownerId,
    );
    await updateProfileItem(
      {
        itemId: profileProject.id,
        patch: {
          title: "Careeright Job Pipeline",
          description: "Updated resume description.",
          tags: ["Kafka", "TypeScript"],
          startDate: "Feb 2026",
          endDate: "Apr 2026",
        },
      },
      ownerId,
    );

    const synced = await syncFromProfileProject(
      { projectId: importedProject!.id },
      ownerId,
    );
    const syncedDetail = await getProject(
      { projectId: importedProject!.id },
      ownerId,
    );

    expect(synced.title).toBe("Careeright Job Pipeline");
    expect(synced.summary).toBe("Updated resume description.");
    expect(synced.techStack).toEqual(["Kafka", "TypeScript"]);
    expect(synced.dateText).toBe("Feb 2026 - Apr 2026");
    expect(syncedDetail.notes.map((note) => note.title)).toContain(
      "Interview story",
    );
    expect(syncedDetail.project.resources[0]?.url).toBe(
      "https://example.com/kafka-pipeline",
    );
  });

  test("keeps projects private per user", async () => {
    const ownerId = userId("project-owner");
    const strangerId = userId("project-stranger");
    const project = await createProject(
      {
        title: "Private Architecture",
        summary: "Owner-only details.",
      },
      ownerId,
    );

    await expect(
      getProject({ projectId: project.id }, strangerId),
    ).rejects.toThrow(/not found/i);
    expect(await listProjects(strangerId)).toHaveLength(0);
  });

  test("supports notes, resources, and attributes", async () => {
    const ownerId = userId("project-notebook-owner");
    const project = await createProject(
      {
        title: "Markdown Notebook",
        summary: "A project with notes and references.",
        techStack: ["Kafka"],
      },
      ownerId,
    );
    const firstNote = await createNote(
      {
        projectId: project.id,
        title: "Overview",
        content: "# Overview\n\nKafka powers the stream.\n\n```mermaid\ngraph TD\n  API --> Kafka\n```",
      },
      ownerId,
    );
    const secondNote = await createNote(
      {
        projectId: project.id,
        title: "Deep dive",
        content: "## Details",
      },
      ownerId,
    );
    const resource = await createResource(
      {
        projectId: project.id,
        title: "Kafka docs",
        url: "https://kafka.apache.org/documentation/",
        type: "documentation",
        note: "Primary docs.",
      },
      ownerId,
    );
    const attribute = await createAttribute(
      {
        projectId: project.id,
        label: "Kafka",
        aliases: ["Apache Kafka"],
        type: "technology",
        description: "Event streaming backbone.",
        resourceIds: [resource.id],
      },
      ownerId,
    );

    const reordered = await reorderNotes(
      { projectId: project.id, noteIds: [secondNote.id, firstNote.id] },
      ownerId,
    );
    const detail = await getProject({ projectId: project.id }, ownerId);

    expect(reordered.map((note) => note.id)).toEqual([
      secondNote.id,
      firstNote.id,
    ]);
    expect(detail.notes[0]?.id).toBe(secondNote.id);
    expect(detail.project.resources[0]).toMatchObject({
      id: resource.id,
      type: "documentation",
    });
    expect(detail.project.attributes[0]).toMatchObject({
      id: attribute.id,
      aliases: ["Apache Kafka"],
      resourceIds: [resource.id],
    });
  });

  test("rejects unsafe resource URLs", async () => {
    const ownerId = userId("project-url-owner");
    const project = await createProject(
      {
        title: "Unsafe URL Check",
        summary: "",
      },
      ownerId,
    );

    await expect(
      createResource(
        {
          projectId: project.id,
          title: "Bad link",
          url: "javascript:alert(1)",
          type: "link",
          note: "",
        },
        ownerId,
      ),
    ).rejects.toThrow(/http and https/i);
  });
});
