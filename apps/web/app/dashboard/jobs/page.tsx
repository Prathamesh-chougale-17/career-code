import { JobsApp } from "@/components/jobs/jobs-app";
import { requirePageSession } from "@/lib/auth/session";
import {
  getJobSearchProfile,
  listJobDigests,
  listJobs,
} from "@careeright/domain/jobs/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardJobsPage() {
  const session = await requirePageSession("/dashboard/jobs");
  const [initialJobs, initialSearchProfile, initialDigests] = await Promise.all([
    loadInitialData("jobs", () => listJobs(session.user.id)),
    loadInitialData("job search profile", () =>
      getJobSearchProfile(session.user.id),
    ),
    loadInitialData("job digests", () => listJobDigests(session.user.id, 10)),
  ]);

  return (
    <JobsApp
      initialJobs={initialJobs}
      initialSearchProfile={initialSearchProfile}
      initialDigests={initialDigests}
    />
  );
}
