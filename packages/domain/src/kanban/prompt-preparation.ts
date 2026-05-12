import {
  type Clarification,
  type PreparedTaskBreakdownPrompt,
  type ProposedTask,
  type TaskBreakdownProposalReview,
  type TaskGenerationBrief,
  preparedTaskBreakdownPromptSchema,
  prepareTaskBreakdownPromptInputSchema,
  taskBreakdownProposalReviewInputSchema,
  taskBreakdownProposalReviewSchema,
} from "@careeright/domain/kanban/schema";

const MAX_CLARIFICATION_ROUNDS = 2;

type PromptSignals = {
  isStudy: boolean;
  isBuild: boolean;
  hasAudience: boolean;
  hasTimeline: boolean;
  hasStack: boolean;
  hasDeliverable: boolean;
  hasConstraints: boolean;
  isOperations: boolean;
  isInterview: boolean;
};

type ProposalKind = TaskGenerationBrief["proposalKind"];

export function prepareTaskBreakdownPrompt(
  input: unknown,
): PreparedTaskBreakdownPrompt {
  const { prompt, clarifications } =
    prepareTaskBreakdownPromptInputSchema.parse(input);
  const clarificationText = clarificationsToText(clarifications);
  const combinedPrompt = [prompt, clarificationText].filter(Boolean).join("\n");
  const signals = promptSignals(combinedPrompt);
  const questions = clarificationQuestions(signals);
  const assumptions = promptAssumptions(signals);
  const generationBrief = buildGenerationBrief({
    combinedPrompt,
    signals,
    assumptions,
  });
  const wordCount = combinedPrompt.split(/\s+/).filter(Boolean).length;
  const specificityScore = [
    signals.hasAudience,
    signals.hasTimeline,
    signals.hasStack,
    signals.hasDeliverable,
    signals.hasConstraints,
  ].filter(Boolean).length;
  const needsClarification = wordCount < 8 || specificityScore < 2;
  const nextRound = Math.min(
    clarifications.length + 1,
    MAX_CLARIFICATION_ROUNDS,
  );
  const roundCapReached = clarifications.length >= MAX_CLARIFICATION_ROUNDS;

  if (needsClarification && !roundCapReached) {
    return preparedTaskBreakdownPromptSchema.parse({
      status: "needs_clarification",
      round: nextRound,
      maxRounds: MAX_CLARIFICATION_ROUNDS,
      questions: questions.slice(0, 5),
      assumptions,
      generationBrief,
    });
  }

  return preparedTaskBreakdownPromptSchema.parse({
    status: "ready",
    round: nextRound,
    maxRounds: MAX_CLARIFICATION_ROUNDS,
    questions: [],
    assumptions,
    refinedPrompt: refinedPrompt(prompt, clarifications, assumptions),
    generationBrief,
  });
}

export function reviewTaskBreakdownProposal(
  input: unknown,
): TaskBreakdownProposalReview {
  const parsed = taskBreakdownProposalReviewInputSchema.parse(input);
  const combinedPrompt = [parsed.prompt, parsed.refinedPrompt]
    .filter(Boolean)
    .join("\n");
  const signals = promptSignals(combinedPrompt);
  const generationBrief = buildGenerationBrief({
    combinedPrompt,
    signals,
    assumptions: promptAssumptions(signals),
  });
  const tasks = parsed.tasks;
  const issues: string[] = [];
  const duplicateOrWeakTasks = taskWeaknesses(tasks);
  const missingCoverage = missingPhaseCoverage(tasks, generationBrief);

  const emptyAcceptanceCount = tasks.filter(
    (task) => task.acceptanceCriteria.length === 0,
  ).length;
  const vagueAcceptanceCount = tasks.filter((task) =>
    task.acceptanceCriteria.some(isVagueAcceptanceCriterion),
  ).length;
  const shortDescriptionCount = tasks.filter(
    (task) => task.description.trim().length < 24,
  ).length;
  const dependencyCount = tasks.filter(
    (task, index) => index > 0 && task.dependencies.length > 0,
  ).length;

  if (emptyAcceptanceCount > 0) {
    issues.push(
      `${emptyAcceptanceCount} task${emptyAcceptanceCount === 1 ? "" : "s"} need measurable acceptance criteria.`,
    );
  }

  if (vagueAcceptanceCount > 0) {
    issues.push(
      `${vagueAcceptanceCount} task${vagueAcceptanceCount === 1 ? "" : "s"} use vague acceptance criteria such as done, learned, or complete.`,
    );
  }

  if (shortDescriptionCount > 0) {
    issues.push(
      `${shortDescriptionCount} task${shortDescriptionCount === 1 ? "" : "s"} need more concrete descriptions.`,
    );
  }

  if (tasks.length >= 4 && dependencyCount === 0) {
    issues.push("Tasks should include dependencies that reference earlier task titles.");
  }

  if (!parsed.title || isGenericProposalTitle(parsed.title)) {
    issues.push("Use a specific proposal title instead of a generic task count.");
  }

  const score = boundedScore(
    100 -
      issues.length * 10 -
      missingCoverage.length * 6 -
      duplicateOrWeakTasks.length * 5,
  );

  return taskBreakdownProposalReviewSchema.parse({
    score,
    verdict:
      score >= 80 && issues.length === 0 && missingCoverage.length <= 1
        ? "ready"
        : "needs_revision",
    issues,
    missingCoverage,
    duplicateOrWeakTasks,
    improvedTitle:
      parsed.title && !isGenericProposalTitle(parsed.title)
        ? parsed.title
        : generationBrief.suggestedTitle,
    improvedSummary:
      parsed.summary && parsed.summary.trim().length >= 24
        ? parsed.summary
        : generationBrief.suggestedSummary,
    recommendedFixes: recommendedFixes(
      issues,
      missingCoverage,
      duplicateOrWeakTasks,
      generationBrief,
    ),
  });
}

function promptSignals(prompt: string): PromptSignals {
  const text = prompt.toLowerCase();

  return {
    isStudy: hasAny(text, [
      /\bstudy\b/,
      /\blearn\b/,
      /\bpractice\b/,
      /\binterview\b/,
      /\bmaster\b/,
      /\blinked lists?\b/,
      /\btrees?\b/,
      /\bgraphs?\b/,
      /\bdsa\b/,
      /\bhld\b/,
      /\blld\b/,
    ]),
    isBuild: hasAny(text, [
      /\bbuild\b/,
      /\bdevelop\b/,
      /\bimplement\b/,
      /\bship\b/,
      /\bfeature\b/,
      /\bsystem\b/,
      /\bapp\b/,
    ]),
    hasAudience: hasAny(text, [
      /\bbeginner\b/,
      /\badvanced\b/,
      /\bmnc\b/,
      /\binterview\b/,
      /\bproduction\b/,
      /\busers?\b/,
      /\badmins?\b/,
      /\bcustomers?\b/,
      /\bteam\b/,
      /\bengineers?\b/,
      /\bstudents?\b/,
      /\balready\s+knows?\b/,
      /\bknows?\s+(?:the\s+)?basics?\b/,
    ]),
    hasTimeline: hasAny(text, [
      /\btoday\b/,
      /\btomorrow\b/,
      /\bweeks?\b/,
      /\bmonths?\b/,
      /\bdays?\b/,
      /\bhours?\b/,
      /\bdeadline\b/,
      /\bsprint\b/,
      /\bphase\b/,
      /\bmvp\b/,
    ]),
    hasStack: hasAny(text, [
      /\bnext\.?js\b/,
      /\breact\b/,
      /\bnode\b/,
      /\btypescript\b/,
      /\bjavascript\b/,
      /\bpython\b/,
      /\bjava\b/,
      /\bgo\b/,
      /\bc\b/,
      /\bc\+\+\b/,
      /\bmongodb\b/,
      /\bpostgres\b/,
      /\bredis\b/,
      /\bkafka\b/,
      /\baws\b/,
      /\bvercel\b/,
      /\bopenai\b/,
      /\bgemini\b/,
      /\bclaude\b/,
      /\bmcp\b/,
      /\bbackend\b/,
      /\bfrontend\b/,
    ]),
    hasDeliverable: hasAny(text, [
      /\bapi\b/,
      /\bui\b/,
      /\bdatabase\b/,
      /\bschema\b/,
      /\btests?\b/,
      /\bdeployment\b/,
      /\bmonitoring\b/,
      /\bdesign\b/,
      /\bproposal\b/,
      /\btasks?\b/,
      /\barchitecture\b/,
      /\broadmap\b/,
      /\bplan\b/,
    ]),
    hasConstraints: hasAny(text, [
      /\bsecurity\b/,
      /\bscale\b/,
      /\bscalable\b/,
      /\bperformance\b/,
      /\brate limits?\b/,
      /\bauth\b/,
      /\bprivacy\b/,
      /\bcost\b/,
      /\blatency\b/,
      /\bobservability\b/,
      /\bmulti-tenant\b/,
      /\breliability\b/,
      /\boffline\b/,
      /\bcompliance\b/,
    ]),
    isOperations: hasAny(text, [
      /\bdeployment\b/,
      /\brelease\b/,
      /\bchecklist\b/,
      /\brunbook\b/,
      /\bincident\b/,
      /\brollback\b/,
      /\bmonitoring\b/,
      /\bon[\s-]?call\b/,
      /\boperational\b/,
      /\bworkflow\b/,
    ]),
    isInterview: hasAny(text, [
      /\binterviews?\b/,
      /\bmnc\b/,
      /\bcoding round\b/,
      /\bplacement\b/,
      /\bmock\b/,
    ]),
  };
}

function clarificationQuestions(signals: PromptSignals) {
  const questions: string[] = [];

  if (!signals.isStudy && !signals.isBuild) {
    questions.push(
      "Should this proposal be a study plan, production implementation plan, interview-prep plan, or operational workflow?",
    );
  }

  if (!signals.hasAudience) {
    questions.push(
      signals.isStudy
        ? "What is your current skill level and target outcome, such as MNC interview readiness, project work, or academic study?"
        : "Who are the primary users or stakeholders, and what workflow should this proposal support?",
    );
  }

  if (!signals.hasTimeline) {
    questions.push(
      "What timeline, milestone deadline, or effort budget should the proposal assume?",
    );
  }

  if (!signals.hasStack) {
    questions.push(
      signals.isStudy
        ? "Which programming language, platform, or interview style should examples and practice use?"
        : "Which stack, platform, service, or integration constraints should the tasks assume?",
    );
  }

  if (!signals.hasDeliverable) {
    questions.push(
      "What concrete deliverables should the proposal produce, such as diagrams, APIs, tests, UI screens, notes, or practice logs?",
    );
  }

  if (!signals.hasConstraints) {
    questions.push(
      "Which constraints matter most: scalability, security, cost, reliability, latency, compliance, or depth of practice?",
    );
  }

  return questions;
}

function promptAssumptions(signals: PromptSignals) {
  const assumptions: string[] = [];

  if (!signals.hasTimeline) {
    assumptions.push("No fixed timeline was provided; use an MVP-first progression.");
  }

  if (!signals.hasAudience) {
    assumptions.push("No audience was specified; assume an individual user reviewing the proposal.");
  }

  if (!signals.hasStack) {
    assumptions.push("No stack was mandated; keep tasks specific without locking unnecessary technology choices.");
  }

  if (!signals.hasConstraints) {
    assumptions.push("No special constraints were provided; include practical quality, safety, and testing checks.");
  }

  return assumptions;
}

function buildGenerationBrief({
  combinedPrompt,
  signals,
  assumptions,
}: {
  combinedPrompt: string;
  signals: PromptSignals;
  assumptions: string[];
}): TaskGenerationBrief {
  const kind = detectProposalKind(signals);
  const topic = detectedTopic(combinedPrompt);
  const audience = detectedAudience(combinedPrompt, signals);
  const constraints = detectedConstraints(combinedPrompt, assumptions);
  const recommendedPhases = phasesFor(kind, topic);

  return {
    proposalKind: kind,
    suggestedTitle: suggestedTitle(topic, kind, combinedPrompt),
    suggestedSummary: suggestedSummary(topic, kind),
    detectedTopic: topic,
    audience,
    constraints,
    recommendedTaskCount: taskCountFor(kind),
    recommendedPhases,
    taskQualityChecklist: [
      "Every task has a concrete action, artifact, or practice output.",
      "Acceptance criteria are measurable and avoid vague words like done or learned.",
      "Dependencies reference exact earlier task titles when order matters.",
      "The proposal covers foundations, core work, practice or implementation, validation, and review.",
    ],
    taskWritingRules: [
      "Use short, specific titles that name the skill, feature, workflow, or artifact.",
      "Write descriptions that tell the user exactly what to do and what to produce.",
      "Use suggestedColumn todo unless the user explicitly asks for another column.",
      "Create as many tasks as needed for full coverage; do not pad with duplicates.",
    ],
    missingContext: missingContext(signals),
  };
}

function detectProposalKind(signals: PromptSignals): ProposalKind {
  if (signals.isInterview) {
    return "interview_prep";
  }

  if (signals.isOperations && !signals.isBuild) {
    return "operations_workflow";
  }

  if (signals.isBuild) {
    return "implementation_plan";
  }

  if (signals.isStudy) {
    return "study_plan";
  }

  return "general_plan";
}

function detectedTopic(prompt: string) {
  const text = prompt.toLowerCase();
  const language = detectedLanguage(prompt);

  if (/\b(hld|high[\s-]*level design)\b/.test(text)) {
    return "HLD";
  }

  if (/\b(lld|low[\s-]*level design)\b/.test(text)) {
    return "LLD";
  }

  if (/\blinked[\s-]*lists?\b/.test(text)) {
    return language ? `Linked List in ${language}` : "Linked List";
  }

  if (/\bgraphs?\b|\bbfs\b|\bdfs\b/.test(text)) {
    const traversals = [
      /\bbfs\b/.test(text) ? "BFS" : "",
      /\bdfs\b/.test(text) ? "DFS" : "",
    ].filter(Boolean);

    return traversals.length > 0
      ? `Graph ${traversals.join("/")}`
      : "Graph";
  }

  if (/\bai chat\b|\bchat\b/.test(text)) {
    return "AI Chat";
  }

  if (/\bdeployment\b|\brelease\b/.test(text)) {
    return "Deployment";
  }

  if (/\bdynamic programming\b|\bdp\b/.test(text)) {
    return "Dynamic Programming";
  }

  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(
      /^(?:please\s+)?(?:create|build|make|generate|plan|prepare|study|learn)\s+(?:a\s+|an\s+|the\s+)?/i,
      "",
    )
    .replace(/\b(?:proposal|tasks|cards|roadmap|plan)\b.*$/i, "")
    .trim();

  return titleCase(cleaned || "General Work").slice(0, 140);
}

function detectedLanguage(prompt: string) {
  if (/\bc\+\+\b|\bcpp\b/i.test(prompt)) {
    return "C++";
  }

  if (/\bc#\b|\bcsharp\b/i.test(prompt)) {
    return "C#";
  }

  if (/\btypescript\b|\bts\b/i.test(prompt)) {
    return "TypeScript";
  }

  if (/\bjavascript\b|\bjs\b/i.test(prompt)) {
    return "JavaScript";
  }

  if (/\bpython\b/i.test(prompt)) {
    return "Python";
  }

  if (/\bjava\b/i.test(prompt)) {
    return "Java";
  }

  if (/\bc\b/i.test(prompt)) {
    return "C";
  }

  return "";
}

function detectedAudience(prompt: string, signals: PromptSignals) {
  const text = prompt.toLowerCase();

  if (/\balready\s+knows?\b|\bknows?\s+(?:the\s+)?basics?\b/.test(text)) {
    return "Learner who knows the basics and needs intermediate practice.";
  }

  if (signals.isInterview) {
    return "Candidate preparing for interview-style evaluation.";
  }

  if (/\bteams?\b/.test(text)) {
    return "Team members using or maintaining the workflow.";
  }

  if (/\busers?\b|\bcustomers?\b/.test(text)) {
    return "Product users and stakeholders affected by the work.";
  }

  return "Individual user reviewing the proposal.";
}

function detectedConstraints(prompt: string, assumptions: string[]) {
  const text = prompt.toLowerCase();
  const constraints = [
    /\brate limits?\b/.test(text) ? "Respect rate limits." : "",
    /\bsecurity\b|\bauth\b|\bprivacy\b/.test(text)
      ? "Include security and privacy checks."
      : "",
    /\bscale\b|\bscalable\b|\bperformance\b|\blatency\b/.test(text)
      ? "Account for scale and performance."
      : "",
    /\bmongodb\b/.test(text) ? "Use MongoDB-aware persistence tasks." : "",
    /\bnext\.?js\b/.test(text) ? "Use Next.js-aware implementation tasks." : "",
    detectedLanguage(prompt)
      ? `Use ${detectedLanguage(prompt)} examples where code is needed.`
      : "",
  ].filter(Boolean);

  if (constraints.length > 0) {
    return constraints;
  }

  return assumptions.length > 0
    ? ["Use practical quality, safety, and validation checks."]
    : ["Follow the prompt's stated constraints."];
}

function suggestedTitle(topic: string, kind: ProposalKind, prompt: string) {
  const text = prompt.toLowerCase();
  const level =
    /\balready\s+knows?\b|\bknows?\s+(?:the\s+)?basics?\b/.test(text)
      ? "Intermediate "
      : /\badvanced\b|\bexpert\b/.test(text)
        ? "Advanced "
        : "";
  const titleTopic =
    topic === "Linked List in C" && level
      ? `${level}Linked List Practice in C`
      : topic;

  if (titleTopic !== topic) {
    return titleTopic;
  }

  const suffixByKind: Record<ProposalKind, string> = {
    study_plan: "Study Plan",
    interview_prep: "Interview Prep",
    implementation_plan: "Implementation Plan",
    operations_workflow: "Operations Workflow",
    general_plan: "Proposal Plan",
  };

  if (topic.endsWith(suffixByKind[kind])) {
    return topic;
  }

  return `${topic} ${suffixByKind[kind]}`.slice(0, 140);
}

function suggestedSummary(topic: string, kind: ProposalKind) {
  const kindLabel = kind.replaceAll("_", " ");

  return `Reviewable ${kindLabel} for ${topic}, with specific tasks, measurable acceptance criteria, dependencies, and validation steps.`;
}

function taskCountFor(kind: ProposalKind) {
  return {
    study_plan: "10-18 tasks",
    interview_prep: "12-20 tasks",
    implementation_plan: "12-22 tasks",
    operations_workflow: "8-14 tasks",
    general_plan: "6-12 tasks",
  }[kind];
}

function phasesFor(kind: ProposalKind, topic: string) {
  if (/linked list/i.test(topic)) {
    return [
      "Baseline and scope",
      "Pointer tracing",
      "Core operations",
      "Pattern drills",
      "Timed practice",
      "Mock assessment",
      "Revision",
    ];
  }

  if (kind === "implementation_plan") {
    return [
      "Requirements and scope",
      "Data model",
      "API/backend",
      "UI/workflow",
      "Quality gates",
      "Rollout",
    ];
  }

  if (kind === "operations_workflow") {
    return [
      "Scope and owners",
      "Preflight checks",
      "Execution steps",
      "Validation",
      "Rollback",
      "Post-run review",
    ];
  }

  if (kind === "interview_prep") {
    return [
      "Baseline",
      "Core patterns",
      "Timed drills",
      "Mock interview",
      "Mistake review",
      "Final revision",
    ];
  }

  if (kind === "study_plan") {
    return [
      "Baseline",
      "Foundations",
      "Core patterns",
      "Practice",
      "Assessment",
      "Revision",
    ];
  }

  return ["Scope", "Plan", "Execute", "Validate", "Review"];
}

function missingContext(signals: PromptSignals) {
  return [
    !signals.hasAudience ? "Audience or skill level" : "",
    !signals.hasTimeline ? "Timeline or effort budget" : "",
    !signals.hasStack ? "Language, stack, or platform" : "",
    !signals.hasDeliverable ? "Expected deliverables" : "",
    !signals.hasConstraints ? "Quality constraints or depth expectations" : "",
  ].filter(Boolean);
}

function taskWeaknesses(tasks: ProposedTask[]) {
  const findings: string[] = [];
  const seenTitles = new Set<string>();

  for (const task of tasks) {
    const normalizedTitle = task.title.toLowerCase().replace(/\W+/g, " ").trim();

    if (seenTitles.has(normalizedTitle)) {
      findings.push(`Duplicate task title: ${task.title}`);
    }

    seenTitles.add(normalizedTitle);

    if (isWeakTaskTitle(task.title)) {
      findings.push(`Weak task title: ${task.title}`);
    }
  }

  return findings;
}

function isWeakTaskTitle(title: string) {
  return /^(?:learn|study|practice|build|create|implement|review)(?:\s+(?:basics?|task|it|things?))?$/i.test(
    title.trim(),
  );
}

function isGenericProposalTitle(title: string) {
  return /^(?:create|generate|make|add)\s+\d+\s+tasks?$/i.test(title.trim());
}

function isVagueAcceptanceCriterion(value: string) {
  return /\b(?:done|complete|completed|understand|learned|good|works)\b/i.test(
    value,
  );
}

function missingPhaseCoverage(
  tasks: ProposedTask[],
  generationBrief: TaskGenerationBrief,
) {
  const taskText = tasks
    .map((task) =>
      [
        task.title,
        task.description,
        ...task.acceptanceCriteria,
        ...task.dependencies,
      ].join(" "),
    )
    .join(" ")
    .toLowerCase();

  return generationBrief.recommendedPhases.filter((phase) => {
    const keywords = phaseKeywords(phase);
    return !keywords.some((keyword) => taskText.includes(keyword));
  });
}

function phaseKeywords(phase: string) {
  const lower = phase.toLowerCase();

  if (lower.includes("baseline") || lower.includes("scope")) {
    return ["baseline", "scope", "diagnostic", "audit"];
  }

  if (lower.includes("pointer")) {
    return ["pointer", "trace", "diagram", "memory"];
  }

  if (lower.includes("core operation")) {
    return ["insert", "delete", "traverse", "search", "operation"];
  }

  if (lower.includes("pattern")) {
    return ["pattern", "reverse", "cycle", "merge", "two pointer"];
  }

  if (lower.includes("timed")) {
    return ["timed", "timebox", "timer"];
  }

  if (lower.includes("mock") || lower.includes("assessment")) {
    return ["mock", "assessment", "test"];
  }

  if (lower.includes("revision") || lower.includes("review")) {
    return ["revision", "review", "mistake", "redo"];
  }

  if (lower.includes("data model")) {
    return ["data", "schema", "model", "database"];
  }

  if (lower.includes("api") || lower.includes("backend")) {
    return ["api", "backend", "route", "server"];
  }

  if (lower.includes("ui") || lower.includes("workflow")) {
    return ["ui", "screen", "workflow", "user"];
  }

  if (lower.includes("quality")) {
    return ["test", "quality", "lint", "validation"];
  }

  if (lower.includes("rollout")) {
    return ["rollout", "deploy", "release"];
  }

  if (lower.includes("preflight")) {
    return ["preflight", "check", "verify"];
  }

  if (lower.includes("execution")) {
    return ["execute", "step", "run"];
  }

  if (lower.includes("rollback")) {
    return ["rollback", "restore", "revert"];
  }

  return lower.split(/\W+/).filter((word) => word.length > 3);
}

function recommendedFixes(
  issues: string[],
  missingCoverage: string[],
  duplicateOrWeakTasks: string[],
  generationBrief: TaskGenerationBrief,
) {
  const fixes = [
    issues.some((issue) => issue.includes("acceptance criteria"))
      ? "Rewrite acceptance criteria with concrete counts, artifacts, examples, tests, logs, or timed drills."
      : "",
    issues.some((issue) => issue.includes("dependencies"))
      ? "Add dependencies that reference exact earlier task titles for ordered work."
      : "",
    duplicateOrWeakTasks.length > 0
      ? "Rename duplicate or generic tasks so each title names a specific action and subject."
      : "",
    missingCoverage.length > 0
      ? `Add coverage for missing phases: ${missingCoverage.join(", ")}.`
      : "",
    `Use the suggested proposal title "${generationBrief.suggestedTitle}" if the current title is generic.`,
  ].filter(Boolean);

  return fixes.length > 0 ? fixes : ["Proposal is ready for submission."];
}

function boundedScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function refinedPrompt(
  prompt: string,
  clarifications: Clarification[],
  assumptions: string[],
) {
  if (clarifications.length === 0 && assumptions.length === 0) {
    return prompt;
  }

  const withAssumptions = [
    prompt,
    ...(clarifications.length > 0
      ? [
          "",
          "Clarifications:",
          ...clarifications.map(
            (item) => `- ${item.question} ${item.answer}`,
          ),
        ]
      : []),
    "",
    "Assumptions:",
    ...assumptions.map((assumption) => `- ${assumption}`),
  ].join("\n");

  return withAssumptions.length <= 8000 ? withAssumptions : prompt;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();

      if (["ai", "api", "bfs", "dfs", "dsa", "hld", "lld", "mcp"].includes(lower)) {
        return lower.toUpperCase();
      }

      if (lower === "mongodb") {
        return "MongoDB";
      }

      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function clarificationsToText(clarifications: Clarification[]) {
  if (clarifications.length === 0) {
    return "";
  }

  return clarifications
    .map((item) => `${item.question}\n${item.answer}`)
    .join("\n");
}
