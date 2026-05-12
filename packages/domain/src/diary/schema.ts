import { z } from "zod";

export const diaryStatusSchema = z.enum(["draft", "complete"]);
export const diaryStatusOptions = diaryStatusSchema.options;

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidDateKey(value: string) {
  if (!dateKeyRegex.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function diaryTextSchema(max: number) {
  return z.string().trim().max(max);
}

export const diaryDateKeySchema = z
  .string()
  .trim()
  .refine(isValidDateKey, "Use a valid date in YYYY-MM-DD format.");

export const diaryTimeSchema = z
  .string()
  .trim()
  .regex(timeRegex, "Use a valid time in HH:mm format.");

const diaryIntervalFields = {
  startTime: diaryTimeSchema,
  endTime: diaryTimeSchema,
  title: diaryTextSchema(120),
  notes: diaryTextSchema(10000),
  summary: diaryTextSchema(10000),
};

function validateIntervalTime(
  interval: { startTime: string; endTime: string },
  context: z.RefinementCtx,
) {
  if (minutes(interval.endTime) <= minutes(interval.startTime)) {
    context.addIssue({
      code: "custom",
      message: "End time must be after start time.",
      path: ["endTime"],
    });
  }
}

function validateCompleteDay(
  day: {
    status: z.infer<typeof diaryStatusSchema>;
    dailySummary: string;
    intervals: Array<{ summary: string }>;
  },
  context: z.RefinementCtx,
) {
  if (day.status !== "complete") {
    return;
  }

  if (day.dailySummary.trim().length === 0 && day.intervals.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Complete diary days need a daily summary or at least one interval.",
      path: ["dailySummary"],
    });
  }

  day.intervals.forEach((interval, index) => {
    if (interval.summary.trim().length === 0) {
      context.addIssue({
        code: "custom",
        message: "Complete diary intervals need a summary.",
        path: ["intervals", index, "summary"],
      });
    }
  });
}

export const diaryIntervalSchema = z
  .object({
    id: z.string(),
    ...diaryIntervalFields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine(validateIntervalTime);

export const saveDiaryIntervalInputSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    ...diaryIntervalFields,
  })
  .superRefine(validateIntervalTime);

export const diaryDaySchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    dateKey: diaryDateKeySchema,
    dailySummary: diaryTextSchema(20000),
    tomorrowFocus: diaryTextSchema(5000),
    status: diaryStatusSchema,
    intervals: z.array(diaryIntervalSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine(validateCompleteDay);

export const saveDiaryDayInputSchema = z
  .object({
    dateKey: diaryDateKeySchema,
    dailySummary: diaryTextSchema(20000).default(""),
    tomorrowFocus: diaryTextSchema(5000).default(""),
    status: diaryStatusSchema.default("draft"),
    intervals: z.array(saveDiaryIntervalInputSchema).max(48).default([]),
  })
  .superRefine(validateCompleteDay);

export const getDiaryDayInputSchema = z.object({
  dateKey: diaryDateKeySchema,
});

export const listRecentDiaryInputSchema = z
  .object({
    limit: z.number().int().min(1).max(90).default(30),
  })
  .default({ limit: 30 });

export const deleteDiaryDayInputSchema = z.object({
  dateKey: diaryDateKeySchema,
});

export const diaryDayResultSchema = diaryDaySchema.nullable();
export const diaryDayListSchema = z.array(diaryDaySchema);
export const deleteDiaryDayResultSchema = z.object({
  deleted: z.boolean(),
});

export type DiaryStatus = z.infer<typeof diaryStatusSchema>;
export type DiaryInterval = z.infer<typeof diaryIntervalSchema>;
export type DiaryDay = z.infer<typeof diaryDaySchema>;
export type SaveDiaryIntervalInput = z.input<
  typeof saveDiaryIntervalInputSchema
>;
export type ParsedSaveDiaryIntervalInput = z.output<
  typeof saveDiaryIntervalInputSchema
>;
export type SaveDiaryDayInput = z.input<typeof saveDiaryDayInputSchema>;
export type ParsedSaveDiaryDayInput = z.output<typeof saveDiaryDayInputSchema>;
export type GetDiaryDayInput = z.input<typeof getDiaryDayInputSchema>;
export type ListRecentDiaryInput = z.input<typeof listRecentDiaryInputSchema>;
export type DeleteDiaryDayInput = z.input<typeof deleteDiaryDayInputSchema>;
