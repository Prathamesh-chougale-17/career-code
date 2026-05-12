import { DiaryApp } from "@/components/diary/diary-app";
import { requirePageSession } from "@/lib/auth/session";
import { getDiaryDay, listRecentDiaryDays } from "@careeright/domain/diary/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardDiaryPage() {
  const session = await requirePageSession("/dashboard/diary");
  const initialSelectedDate = new Date().toISOString().slice(0, 10);
  const [initialRecentDays, initialSelectedDay] = await Promise.all([
    loadInitialData("recent diary days", () =>
      listRecentDiaryDays({ limit: 30 }, session.user.id),
    ),
    loadInitialData("selected diary day", () =>
      getDiaryDay({ dateKey: initialSelectedDate }, session.user.id),
    ),
  ]);

  return (
    <DiaryApp
      initialRecentDays={initialRecentDays}
      initialSelectedDate={initialSelectedDate}
      initialSelectedDay={initialSelectedDay}
    />
  );
}
