import { describe, expect, test } from "vitest";

import {
  createProfileImportInputSchema,
  createProfileItemInputSchema,
  profileApplicationDefaultsSchema,
  profileBasicsInputSchema,
  profileSchema,
} from "@careeright/domain/profile/schema";
import { parseResumeText } from "@careeright/domain/profile/resume-parser";
import {
  applyProfileImport,
  createProfileImport,
  createProfileItem,
  deleteProfileItem,
  getProfileSnapshot,
  listProfileImports,
  profileItemFingerprint,
  rejectProfileImport,
  updateProfileApplicationDefaults,
  updateProfileBasics,
  updateProfileItem,
} from "@careeright/domain/profile/store";

process.env.MONGODB_URI = "";

describe("profile schemas", () => {
  test("accepts empty profile basics with defaults", () => {
    const basics = profileBasicsInputSchema.parse({});

    expect(basics.displayName).toBe("");
    expect(basics.summary).toBe("");
  });

  test("defaults application fields on existing profile shapes", () => {
    const profile = profileSchema.parse({
      id: "profile-existing",
      userId: "profile-existing-user",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
    });
    const defaults = profileApplicationDefaultsSchema.parse({});

    expect(profile.applicationDefaults).toEqual(defaults);
    expect(profile.applicationDefaults.joiningAvailabilityDays).toBeNull();
    expect(profile.applicationDefaults.resumeLocalPath).toBe("");
  });

  test("rejects unsafe profile links", () => {
    expect(() =>
      createProfileItemInputSchema.parse({
        type: "project",
        title: "Unsafe link",
        url: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  test("accepts structured resume imports", () => {
    const profileImport = createProfileImportInputSchema.parse({
      profileBasics: {
        displayName: "Pratham",
        email: "pratham@example.com",
        website: "https://example.com",
      },
      summary: "Extracted from a resume.",
      items: [
        {
          type: "experience",
          title: "Frontend Developer",
          organization: "Careeright",
          tags: ["React", "TypeScript"],
        },
        {
          type: "achievement",
          title: "Hackathon Winner",
          description: "Won a national-level product build challenge.",
        },
      ],
    });

    expect(profileImport.profileBasics.displayName).toBe("Pratham");
    expect(profileImport.items[0].type).toBe("experience");
    expect(profileImport.items[0].tags).toEqual(["React", "TypeScript"]);
    expect(profileImport.items[1].type).toBe("achievement");
  });

  test("parses selectable resume text into a structured profile import", () => {
    const parsed = parseResumeText(`
Pratham Example
Full-stack Developer
Bengaluru, India
pratham@example.com | https://github.com/pratham

Summary
Developer focused on reliable study tools and full-stack product workflows.

Experience
Frontend Developer
Careeright Labs
Jan 2024 - Present
- Built profile tooling with Next.js and MongoDB.
- Improved task workflows with TypeScript.

Education
B.Tech Computer Science
Example University
2021 - 2025

Projects
Careeright Dashboard | Next.js, TypeScript
- Built a kanban and profile workspace.

Achievements
- Winner of Example Hackathon 2024
- LeetCode Rating: 1500+ with 300+ prob-
lems solved.

Certifications
- Machine Learning A-Z: AI, Python - Udemy

Skills
Languages: TypeScript, JavaScript, Python
Tools: MongoDB, React, Next.js
`);

    expect(parsed.profileBasics.displayName).toBe("Pratham Example");
    expect(parsed.profileBasics.email).toBe("pratham@example.com");
    expect(parsed.profileBasics.website).toBe("https://github.com/pratham");
    expect(parsed.items.some((item) => item.type === "experience")).toBe(true);
    expect(parsed.items.some((item) => item.type === "education")).toBe(true);
    expect(parsed.items.some((item) => item.type === "project")).toBe(true);
    expect(
      parsed.items.find((item) => item.type === "project")?.title,
    ).toBe("Careeright Dashboard");
    expect(parsed.items.some((item) => item.type === "achievement")).toBe(true);
    expect(
      parsed.items.some(
        (item) =>
          item.type === "achievement" &&
          item.title === "LeetCode Rating: 1500+ with 300+ problems solved.",
      ),
    ).toBe(true);
    expect(parsed.items.some((item) => item.type === "certification")).toBe(
      true,
    );
    expect(
      parsed.items.find((item) => item.type === "certification")
        ?.organization,
    ).toBe("Udemy");
    expect(parsed.items.some((item) => item.type === "skill")).toBe(true);
  });

  test("rejects invalid structured resume import fields", () => {
    expect(() =>
      createProfileImportInputSchema.parse({
        profileBasics: {
          email: "not-an-email",
        },
        items: [
          {
            type: "skill",
            title: "TypeScript",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      createProfileImportInputSchema.parse({
        items: [
          {
            type: "unknown",
            title: "Invalid type",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      createProfileImportInputSchema.parse({
        items: [
          {
            type: "project",
            title: "Unsafe URL",
            url: "javascript:alert(1)",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("profile store", () => {
  test("updates profile basics per user", async () => {
    const userId = `profile-user-${crypto.randomUUID()}`;

    await updateProfileBasics(
      {
        displayName: "Pratham",
        headline: "Full-stack developer",
        location: "India",
        email: "pratham@example.com",
        website: "https://example.com",
        summary: "Building focused study and portfolio systems.",
      },
      userId,
    );

    const snapshot = await getProfileSnapshot(userId);

    expect(snapshot.profile.displayName).toBe("Pratham");
    expect(snapshot.profile.website).toBe("https://example.com");
    expect(snapshot.items).toHaveLength(0);
  });

  test("updates application defaults per user", async () => {
    const userA = `profile-defaults-a-${crypto.randomUUID()}`;
    const userB = `profile-defaults-b-${crypto.randomUUID()}`;

    await updateProfileApplicationDefaults(
      {
        phone: "+91 9876543210",
        gender: "Male",
        defaultSource: "LinkedIn",
        joiningAvailabilityDays: 60,
        resumeLocalPath: "C:\\Users\\prath\\resume.pdf",
        xiiPercentage: "84",
        xPercentage: "78",
      },
      userA,
    );

    const userASnapshot = await getProfileSnapshot(userA);
    const userBSnapshot = await getProfileSnapshot(userB);

    expect(userASnapshot.profile.applicationDefaults.defaultSource).toBe(
      "LinkedIn",
    );
    expect(
      userASnapshot.profile.applicationDefaults.joiningAvailabilityDays,
    ).toBe(60);
    expect(userASnapshot.profile.applicationDefaults.xiiPercentage).toBe("84");
    expect(userBSnapshot.profile.applicationDefaults.defaultSource).toBe("");
  });

  test("creates, updates, deletes, and scopes profile items", async () => {
    const userA = `profile-a-${crypto.randomUUID()}`;
    const userB = `profile-b-${crypto.randomUUID()}`;

    const project = await createProfileItem(
      {
        type: "project",
        title: "Careeright profile section",
        organization: "Careeright",
        description: "Added a profile builder with saved sections.",
        tags: ["Next.js", "MongoDB"],
      },
      userA,
    );

    await createProfileItem(
      {
        type: "skill",
        title: "TypeScript",
      },
      userB,
    );

    const updated = await updateProfileItem(
      {
        itemId: project.id,
        patch: {
          type: "certification",
          title: "Profile feature shipped",
          tags: ["Next.js", "oRPC"],
        },
      },
      userA,
    );

    expect(updated.type).toBe("certification");
    expect(updated.tags).toEqual(["Next.js", "oRPC"]);

    const userASnapshot = await getProfileSnapshot(userA);
    const userBSnapshot = await getProfileSnapshot(userB);

    expect(userASnapshot.items.map((item) => item.id)).toEqual([project.id]);
    expect(userBSnapshot.items).toHaveLength(1);
    expect(userBSnapshot.items[0].title).toBe("TypeScript");

    await deleteProfileItem({ itemId: project.id }, userA);

    expect((await getProfileSnapshot(userA)).items).toHaveLength(0);
    expect((await getProfileSnapshot(userB)).items).toHaveLength(1);
  });

  test("creates pending profile imports scoped per user", async () => {
    const userA = `profile-import-a-${crypto.randomUUID()}`;
    const userB = `profile-import-b-${crypto.randomUUID()}`;
    const profileImport = await createProfileImport(
      {
        profileBasics: {
          displayName: "Scoped Import",
        },
        items: [
          {
            type: "skill",
            title: "React",
          },
        ],
        summary: "Resume extraction.",
      },
      userA,
      "pdf",
    );

    expect(profileImport.status).toBe("pending");
    expect(profileImport.source).toBe("pdf");
    expect((await listProfileImports(userA)).map((item) => item.id)).toEqual([
      profileImport.id,
    ]);
    expect(await listProfileImports(userB)).toHaveLength(0);
  });

  test("applies profile imports with merge-safe basics and duplicate skipping", async () => {
    const userId = `profile-apply-${crypto.randomUUID()}`;

    await updateProfileBasics(
      {
        displayName: "Existing Name",
        headline: "",
        location: "",
        email: "",
        website: "",
        summary: "",
      },
      userId,
    );
    const existingProject = await createProfileItem(
      {
        type: "project",
        title: "Careeright",
        organization: "Open Source",
        startDate: "2026",
        tags: ["Next.js"],
      },
      userId,
    );
    const profileImport = await createProfileImport(
      {
        profileBasics: {
          displayName: "Imported Name",
          headline: "Full-stack developer",
          location: "India",
        },
        items: [
          {
            type: existingProject.type,
            title: existingProject.title,
            organization: existingProject.organization,
            startDate: existingProject.startDate,
            tags: ["Duplicate should be skipped"],
          },
          {
            type: "certification",
            title: "AWS Cloud Practitioner",
            organization: "AWS",
            tags: ["Cloud"],
          },
        ],
      },
      userId,
      "mcp",
    );

    const result = await applyProfileImport(
      { importId: profileImport.id },
      userId,
    );
    const snapshot = await getProfileSnapshot(userId);
    const projectFingerprint = profileItemFingerprint(existingProject);

    expect(result.import.status).toBe("applied");
    expect(result.addedItemCount).toBe(1);
    expect(result.skippedItemCount).toBe(1);
    expect(result.updatedBasicFields.sort()).toEqual(["headline", "location"]);
    expect(snapshot.profile.displayName).toBe("Existing Name");
    expect(snapshot.profile.headline).toBe("Full-stack developer");
    expect(snapshot.profile.location).toBe("India");
    expect(
      snapshot.items.filter((item) => profileItemFingerprint(item) === projectFingerprint),
    ).toHaveLength(1);
    expect(
      snapshot.items.some((item) => item.title === "AWS Cloud Practitioner"),
    ).toBe(true);
    expect(await listProfileImports(userId)).toHaveLength(0);
  });

  test("rejects pending profile imports without changing profile data", async () => {
    const userId = `profile-reject-${crypto.randomUUID()}`;
    const profileImport = await createProfileImport(
      {
        profileBasics: {
          displayName: "Rejected Name",
        },
        items: [
          {
            type: "skill",
            title: "Rejected Skill",
          },
        ],
      },
      userId,
      "mcp",
    );

    const rejected = await rejectProfileImport(
      { importId: profileImport.id },
      userId,
    );
    const snapshot = await getProfileSnapshot(userId);

    expect(rejected.status).toBe("rejected");
    expect(snapshot.profile.displayName).toBe("");
    expect(snapshot.items).toHaveLength(0);
    expect(await listProfileImports(userId)).toHaveLength(0);
  });
});
