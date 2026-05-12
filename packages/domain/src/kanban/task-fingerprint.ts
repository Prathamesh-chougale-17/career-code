export type TaskFingerprintInput = {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
};

export function taskFingerprint(task: TaskFingerprintInput) {
  return JSON.stringify({
    title: normalizeText(task.title),
    description: normalizeText(task.description),
    acceptanceCriteria: task.acceptanceCriteria.map(normalizeText),
    dependencies: task.dependencies.map(normalizeText),
  });
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
