import type { AiProposal } from "@career-code/domain/kanban/schema";

export type ProposalTopic = {
  name: string;
  slug: string;
};

const genericProposalTitlePattern =
  /^(?:create|generate|make|add)\s+\d+\s+tasks?$/i;

const knownTopicCasing = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["apis", "APIs"],
  ["bfs", "BFS"],
  ["bst", "BST"],
  ["c", "C"],
  ["ci", "CI"],
  ["cli", "CLI"],
  ["css", "CSS"],
  ["dfs", "DFS"],
  ["dp", "DP"],
  ["dsa", "DSA"],
  ["graphql", "GraphQL"],
  ["hld", "HLD"],
  ["html", "HTML"],
  ["http", "HTTP"],
  ["https", "HTTPS"],
  ["js", "JS"],
  ["json", "JSON"],
  ["jwt", "JWT"],
  ["lld", "LLD"],
  ["mcp", "MCP"],
  ["mnc", "MNC"],
  ["mongodb", "MongoDB"],
  ["next.js", "Next.js"],
  ["nextjs", "Next.js"],
  ["oauth", "OAuth"],
  ["rest", "REST"],
  ["sql", "SQL"],
  ["ui", "UI"],
  ["url", "URL"],
]);

const languagePatterns: Array<[RegExp, string]> = [
  [/\bc\+\+\b|\bcpp\b/i, "C++"],
  [/\bc#\b|\bcsharp\b/i, "C#"],
  [/\btypescript\b|\bts\b/i, "TypeScript"],
  [/\bjavascript\b|\bjs\b/i, "JavaScript"],
  [/\bpython\b/i, "Python"],
  [/\bjava\b/i, "Java"],
  [/\bgolang\b|\bgo\b/i, "Go"],
  [/\brust\b/i, "Rust"],
  [/\bc\b/i, "C"],
];

type TopicFocus = "Basics" | "Interview Prep" | "Practice" | "Study Plan";
type TopicLevel = "Beginner" | "Intermediate" | "Advanced";

export function proposalTopic(proposal: AiProposal): ProposalTopic {
  const text = proposalTopicText(proposal);

  if (/\b(hld|high[\s-]*level design)\b/i.test(text)) {
    return { name: "HLD", slug: "hld" };
  }

  if (/\b(lld|low[\s-]*level design)\b/i.test(text)) {
    return { name: "LLD", slug: "lld" };
  }

  const name = derivedTopicName(proposal, text);
  return { name, slug: slugifyTopic(name) };
}

export function slugifyTopic(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "general";
}

function proposalTopicText(proposal: AiProposal) {
  const prompt = proposalTaskBreakdownText(proposal);

  return [prompt, proposal.title, proposal.summary].filter(Boolean).join(" ");
}

function derivedTopicName(proposal: AiProposal, text: string) {
  const explicitTitle = meaningfulProposalTitle(proposal.title);

  if (explicitTitle) {
    return truncateTopic(titleizeTopic(explicitTitle));
  }

  const source = proposalTaskBreakdownText(proposal) || text || proposal.title;
  const structuredTopic = dsaTopicName(source);

  if (structuredTopic) {
    return truncateTopic(structuredTopic);
  }

  const compact = source.replace(/\s+/g, " ").trim();
  const cleaned = cleanTopicCandidate(compact);

  return truncateTopic(titleizeTopic(cleaned) || "General");
}

function truncateTopic(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 48) {
    return normalized;
  }

  return `${normalized.slice(0, 45).trim()}...`;
}

function proposalTaskBreakdownText(proposal: AiProposal) {
  if (proposal.type !== "task_breakdown" || !("prompt" in proposal.payload)) {
    return "";
  }

  return [proposal.payload.prompt, proposal.payload.refinedPrompt]
    .filter(Boolean)
    .join(" ");
}

function meaningfulProposalTitle(title: string) {
  const compact = title.replace(/\s+/g, " ").trim();

  if (!compact || genericProposalTitlePattern.test(compact)) {
    return "";
  }

  return compact;
}

function dsaTopicName(source: string) {
  const text = source.toLowerCase();
  const subject = dsaSubject(text);

  if (!subject) {
    return "";
  }

  const language = detectLanguage(source);
  const level = detectLevel(text);
  const focus = detectFocus(text, level);
  const pieces = [
    focus === "Interview Prep" ? "" : level,
    subject,
    focus,
  ].filter(Boolean);
  const name = pieces.join(" ");

  return language ? `${name} in ${language}` : name;
}

function dsaSubject(text: string) {
  if (/\blinked[\s-]*lists?\b/.test(text)) {
    if (/\bcycle\b/.test(text)) {
      return "Linked List Cycle Detection";
    }

    if (/\bmerge\b/.test(text)) {
      return "Linked List Merge";
    }

    if (/\brevers(?:e|al|ing)\b/.test(text)) {
      return "Linked List Reversal";
    }

    return "Linked List";
  }

  if (/\bgraphs?\b/.test(text) || /\bbfs\b|\bdfs\b/.test(text)) {
    const traversals = [
      /\bbfs\b|\bbreadth[\s-]*first\b/.test(text) ? "BFS" : "",
      /\bdfs\b|\bdepth[\s-]*first\b/.test(text) ? "DFS" : "",
    ].filter(Boolean);

    return traversals.length > 0
      ? `Graph ${traversals.join("/")}`
      : "Graph";
  }

  if (/\bdynamic programming\b|\bdp\b/.test(text)) {
    return "Dynamic Programming";
  }

  if (/\btrees?\b|\bbinary tree\b/.test(text)) {
    return "Tree";
  }

  if (/\barrays?\b/.test(text)) {
    return "Array";
  }

  if (/\bstrings?\b/.test(text)) {
    return "String";
  }

  if (/\bstacks?\b/.test(text)) {
    return "Stack";
  }

  if (/\bqueues?\b/.test(text)) {
    return "Queue";
  }

  if (/\brecursion\b/.test(text)) {
    return "Recursion";
  }

  if (/\bbacktracking\b/.test(text)) {
    return "Backtracking";
  }

  if (/\bsorting\b/.test(text)) {
    return "Sorting";
  }

  if (/\bsearching\b/.test(text)) {
    return "Searching";
  }

  if (/\bhash(?:\s|-)*(?:map|table|set)\b/.test(text)) {
    return "Hashing";
  }

  if (/\bsliding window\b/.test(text)) {
    return "Sliding Window";
  }

  if (/\btwo pointers?\b/.test(text)) {
    return "Two Pointers";
  }

  return "";
}

function detectLanguage(source: string) {
  return languagePatterns.find(([pattern]) => pattern.test(source))?.[1] ?? "";
}

function detectLevel(text: string): TopicLevel | "" {
  if (
    /\balready\s+knows?\b/.test(text) ||
    /\bknows?\s+(?:the\s+)?basics?\b/.test(text) ||
    /\bfamiliar\s+with\b/.test(text)
  ) {
    return "Intermediate";
  }

  if (/\badvanced\b|\bexpert\b|\bdeep dive\b/.test(text)) {
    return "Advanced";
  }

  if (/\bbeginners?\b|\bfrom scratch\b|\bnew to\b/.test(text)) {
    return "Beginner";
  }

  return "";
}

function detectFocus(text: string, level: TopicLevel | ""): TopicFocus | "" {
  if (
    /\binterviews?\b|\bmnc\b|\bcoding round\b|\bplacement\b/.test(text)
  ) {
    return "Interview Prep";
  }

  if (/\bpractice\b|\bproblems?\b|\bleetcode\b|\bdrills?\b/.test(text)) {
    return "Practice";
  }

  if (level === "Intermediate" || level === "Advanced") {
    return "Practice";
  }

  if (level === "Beginner" || /\bbasics?\b|\bfundamentals?\b/.test(text)) {
    return "Basics";
  }

  if (/\bstudy\b|\blearn\b|\bmaster\b|\bunderstand\b/.test(text)) {
    return "Study Plan";
  }

  return "";
}

function cleanTopicCandidate(source: string) {
  const compact = source.replace(/[“”‘’"`]/g, "").replace(/\s+/g, " ").trim();
  const scopedProposal = compact.match(
    /\b(?:proposal|proposals|tasks|cards|roadmap|plan)\s+(?:for|about|on)\s+(.+)$/i,
  )?.[1];
  const candidate = scopedProposal ?? compact;

  return candidate
    .replace(
      /^(?:please\s+)?(?:can you\s+)?(?:add|build|create|generate|make|plan|prepare|study|learn)\s+(?:a\s+|an\s+|the\s+)?/i,
      "",
    )
    .replace(
      /^(?:proposal|proposals|tasks|cards|roadmap|plan)\s+(?:for|about|on)\s+/i,
      "",
    )
    .replace(/^(?:about|on)\s+/i, "")
    .replace(/\b(?:proposal|proposals|tasks|cards|roadmap|plan)\b.*$/i, "")
    .trim();
}

function titleizeTopic(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(titleizeWord)
    .join(" ");
}

function titleizeWord(word: string) {
  const trimmed = word.trim();
  const lower = trimmed.toLowerCase();
  const known = knownTopicCasing.get(lower);

  if (known) {
    return known;
  }

  if (/^[A-Z0-9+#./-]{2,}$/.test(trimmed)) {
    return trimmed;
  }

  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}
