import {
  getProjectsSummary,
  listProjects,
} from "@careeright/domain/projects/store";
import { ProjectsApp } from "@repo/ui/components/projects/projects-app";

import { requirePageSession } from "@/lib/auth/session";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardProjectsPage() {
  const session = await requirePageSession("/dashboard/projects");
  const [initialSummary, initialProjects] = await Promise.all([
    loadInitialData("projects summary", () =>
      getProjectsSummary(session.user.id),
    ),
    loadInitialData("projects list", () => listProjects(session.user.id)),
  ]);

  return (
    <ProjectsApp
      initialProjects={initialProjects}
      initialSummary={initialSummary}
    />
  );
}
