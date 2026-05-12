import type {
  CreateProfileItemInput,
  ProfileBasicsDraft,
  ProfileItemType,
} from "@career-code/domain/profile/schema";

type ResumeSectionKey =
  | "summary"
  | "experience"
  | "education"
  | "project"
  | "skill"
  | "certification"
  | "achievement";

export type ParsedResume = {
  profileBasics: ProfileBasicsDraft;
  items: CreateProfileItemInput[];
  summary: string;
  warnings: string[];
  textLength: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

const sectionMatchers: Record<ResumeSectionKey, RegExp[]> = {
  summary: [
    /^(professional\s+)?summary$/,
    /^profile$/,
    /^about$/,
    /^objective$/,
    /^career\s+objective$/,
  ],
  experience: [
    /^(work\s+|professional\s+|relevant\s+)?experience$/,
    /^employment(\s+history)?$/,
    /^work\s+history$/,
    /^internships?$/,
  ],
  education: [/^education$/, /^academic\s+background$/, /^academics$/],
  project: [
    /^projects?$/,
    /^selected\s+projects?$/,
    /^portfolio$/,
    /^research\s+projects?$/,
  ],
  skill: [
    /^skills?$/,
    /^technical\s+skills?$/,
    /^core\s+skills?$/,
    /^technologies$/,
    /^tools$/,
    /^competencies$/,
  ],
  certification: [
    /^certifications?$/,
    /^certificates?$/,
    /^licenses?$/,
  ],
  achievement: [
    /^awards?$/,
    /^achievements?$/,
    /^accomplishments?$/,
    /^honou?rs?$/,
  ],
};

const monthPattern =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const yearPattern = "(?:19|20)\\d{2}";
const dateTokenPattern = `(?:(?:${monthPattern})\\s+)?${yearPattern}|present|current|now`;
const dateRangeRegex = new RegExp(
  `\\b(${dateTokenPattern})\\b\\s*(?:-|to|through|until)\\s*\\b(${dateTokenPattern})\\b`,
  "i",
);
const singleDateRegex = new RegExp(`\\b(${dateTokenPattern})\\b`, "i");
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const urlRegex =
  /\b(?:https?:\/\/|www\.)[^\s<>()]+|\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|portfolio\.|[a-z0-9-]+\.(?:dev|app|io|me|co|in|com|net|org))[^\s<>()]*/gi;

export function parseResumeText(rawText: string): ParsedResume {
  const text = normalizeText(rawText);
  const lines = toLines(text);
  const { sections, firstSectionIndex } = splitIntoSections(lines);
  const topLines = lines.slice(0, Math.max(firstSectionIndex, 12));
  const profileBasics = parseProfileBasics(lines, topLines, sections);
  const items = uniqueItems([
    ...parseDatedItems(sectionLines(sections, "experience"), "experience", 12),
    ...parseDatedItems(sectionLines(sections, "education"), "education", 6),
    ...parseProjectItems(sectionLines(sections, "project"), "project", 12),
    ...parseSkillItems(sectionLines(sections, "skill")),
    ...parseListItems(
      sectionLines(sections, "certification"),
      "certification",
      12,
    ),
    ...parseListItems(sectionLines(sections, "achievement"), "achievement", 12),
  ]).slice(0, 100);
  const warnings = buildWarnings(text, profileBasics, items);

  return {
    profileBasics,
    items,
    summary: buildImportSummary(profileBasics, items),
    warnings,
    textLength: text.length,
  };
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u00a0\t]/g, " ")
    .replace(/[\u2022\u25cf\u25aa\u25ab\u25e6\u2219]/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toLines(text: string) {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .replace(/^[-*]\s*/, "- ")
        .trim(),
    )
    .filter(Boolean);
}

function splitIntoSections(lines: string[]) {
  const sections = new Map<ResumeSectionKey, string[]>();
  let current: ResumeSectionKey | null = null;
  let firstSectionIndex = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const section = getSectionKey(line);

    if (section) {
      current = section;
      firstSectionIndex = Math.min(firstSectionIndex, index);
      sections.set(section, sections.get(section) ?? []);
      continue;
    }

    if (current) {
      sections.get(current)?.push(line);
    }
  }

  return { sections, firstSectionIndex };
}

function getSectionKey(line: string): ResumeSectionKey | null {
  const normalized = line
    .replace(/[:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized || normalized.length > 42) {
    return null;
  }

  for (const [key, matchers] of Object.entries(sectionMatchers)) {
    if (matchers.some((matcher) => matcher.test(normalized))) {
      return key as ResumeSectionKey;
    }
  }

  return null;
}

function sectionLines(
  sections: Map<ResumeSectionKey, string[]>,
  key: ResumeSectionKey,
) {
  return sections.get(key) ?? [];
}

function parseProfileBasics(
  lines: string[],
  topLines: string[],
  sections: Map<ResumeSectionKey, string[]>,
): ProfileBasicsDraft {
  const fullText = lines.join("\n");
  const displayName = findDisplayName(topLines);
  const email = fullText.match(emailRegex)?.[0] ?? "";
  const website = findWebsite(fullText);
  const headline = findHeadline(topLines, displayName);
  const location = findLocation(topLines, displayName, headline);
  const summary = findSummary(lines, sections);

  return stripEmptyFields({
    displayName,
    headline,
    location,
    email,
    website,
    summary,
  });
}

function findDisplayName(topLines: string[]) {
  return (
    topLines.find((line) => {
      if (
        isContactLine(line) ||
        getSectionKey(line) ||
        /^(resume|curriculum vitae|cv)$/i.test(line)
      ) {
        return false;
      }

      const wordCount = line.split(/\s+/).length;
      return line.length >= 2 && line.length <= 80 && wordCount <= 7;
    }) ?? ""
  );
}

function findHeadline(topLines: string[], displayName: string) {
  return (
    topLines.find((line) => {
      if (
        line === displayName ||
        isContactLine(line) ||
        getSectionKey(line) ||
        looksLikeLocation(line) ||
        findDateRange(line)
      ) {
        return false;
      }

      return line.length >= 4 && line.length <= 140;
    }) ?? ""
  );
}

function findLocation(
  topLines: string[],
  displayName: string,
  headline: string,
) {
  return (
    topLines.find((line) => {
      if (
        line === displayName ||
        line === headline ||
        isContactLine(line) ||
        getSectionKey(line) ||
        findDateRange(line)
      ) {
        return false;
      }

      return looksLikeLocation(line);
    }) ?? ""
  );
}

function findSummary(
  lines: string[],
  sections: Map<ResumeSectionKey, string[]>,
) {
  const explicitSummary = sectionLines(sections, "summary")
    .filter((line) => !getSectionKey(line))
    .slice(0, 8)
    .join("\n");

  if (explicitSummary) {
    return limitText(stripBullets(explicitSummary), 2000);
  }

  const beforeFirstSection = lines
    .slice(0, 14)
    .filter((line) => {
      if (isContactLine(line) || getSectionKey(line) || looksLikeLocation(line)) {
        return false;
      }

      return line.length >= 70 || /[.!?]$/.test(line);
    })
    .slice(0, 4)
    .join("\n");

  return limitText(stripBullets(beforeFirstSection), 2000);
}

function findWebsite(text: string) {
  const matches = [...text.matchAll(urlRegex)]
    .map((match) => cleanUrl(match[0]))
    .filter(Boolean);
  const preferred =
    matches.find((url) => /linkedin|github|portfolio|\.dev|\.me/i.test(url)) ??
    matches[0] ??
    "";

  return preferred;
}

function cleanUrl(value: string) {
  const stripped = value.replace(/[),.;]+$/g, "");
  const withProtocol = /^https?:\/\//i.test(stripped)
    ? stripped
    : `https://${stripped.replace(/^www\./i, "www.")}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function parseDatedItems(
  rawLines: string[],
  type: Extract<ProfileItemType, "experience" | "education">,
  limit: number,
) {
  const lines = usableSectionLines(rawLines);
  const dateIndexes = lines
    .map((line, index) => (findDateRange(line) ? index : -1))
    .filter((index) => index !== -1);

  if (dateIndexes.length === 0) {
    return parseUndatedSectionItems(lines, type, limit);
  }

  const starts = dateIndexes.map((dateIndex, position) => {
    const previousStart = position === 0 ? 0 : dateIndexes[position - 1] + 1;
    let start = dateIndex;

    while (
      start > previousStart &&
      dateIndex - start < 2 &&
      isHeaderCandidate(lines[start - 1])
    ) {
      start -= 1;
    }

    return start;
  });

  const items: CreateProfileItemInput[] = [];

  for (let position = 0; position < dateIndexes.length; position += 1) {
    const start = starts[position];
    const nextStart = starts[position + 1] ?? lines.length;
    const chunk = lines.slice(start, nextStart);
    const item = parseDatedChunk(chunk, type);

    if (item) {
      items.push(item);
    }

    if (items.length >= limit) {
      break;
    }
  }

  return uniqueItems(items);
}

function parseDatedChunk(
  chunk: string[],
  type: Extract<ProfileItemType, "experience" | "education">,
): CreateProfileItemInput | null {
  const dateIndex = chunk.findIndex((line) => Boolean(findDateRange(line)));
  const dateRange = dateIndex === -1 ? undefined : findDateRange(chunk[dateIndex]);

  if (!dateRange) {
    return null;
  }

  const headerText = chunk
    .slice(0, dateIndex + 1)
    .filter((line) => !isBulletLine(line))
    .map((line) => stripDateRange(line))
    .filter(Boolean)
    .join(" | ");
  const parsedHeader = parseHeader(headerText, type);
  const description = chunk
    .slice(dateIndex + 1)
    .filter((line) => !looksLikeStandaloneDate(line))
    .map(stripBulletPrefix)
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");

  if (!parsedHeader.title) {
    return null;
  }

  return makeItem({
    type,
    title: parsedHeader.title,
    organization: parsedHeader.organization,
    location: parsedHeader.location,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    description,
    tags: [],
  });
}

function parseUndatedSectionItems(
  lines: string[],
  type: Extract<ProfileItemType, "experience" | "education">,
  limit: number,
) {
  const items: CreateProfileItemInput[] = [];

  for (let index = 0; index < lines.length && items.length < limit; index += 1) {
    const line = lines[index];

    if (!isHeaderCandidate(line)) {
      continue;
    }

    const next = lines[index + 1] ?? "";
    const parsedHeader = parseHeader(
      [line, isHeaderCandidate(next) ? next : ""].filter(Boolean).join(" | "),
      type,
    );

    if (parsedHeader.title) {
      items.push(
        makeItem({
          type,
          title: parsedHeader.title,
          organization: parsedHeader.organization,
          location: parsedHeader.location,
          startDate: "",
          endDate: "",
          description: "",
          tags: [],
        }),
      );
    }
  }

  return uniqueItems(items);
}

function parseProjectItems(
  rawLines: string[],
  type: Extract<ProfileItemType, "project">,
  limit: number,
) {
  const lines = usableSectionLines(rawLines);
  const items: CreateProfileItemInput[] = [];
  let current: {
    title: string;
    description: string[];
    dateRange?: DateRange;
    tags: string[];
    url: string;
  } | null = null;

  function flush() {
    if (!current?.title) {
      current = null;
      return;
    }

    items.push(
      makeItem({
        type,
        title: current.title,
        organization: "",
        location: "",
        startDate: current.dateRange?.startDate ?? "",
        endDate: current.dateRange?.endDate ?? "",
        description: current.description.join("\n"),
        tags: current.tags,
        url: current.url,
      }),
    );
    current = null;
  }

  for (const line of lines) {
    const dateRange = findDateRange(line);
    const withoutDate = stripDateRange(line);
    const url = findWebsite(line);
    const titleCandidate = withoutDate.replace(urlRegex, "").trim();
    const [titlePart] = titleCandidate
      .split(/\s+\|\s+|\s+-\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const isNewEntry =
      isHeaderCandidate(line) ||
      (dateRange && titleCandidate.length > 0 && titleCandidate.length <= 140);

    if (isNewEntry) {
      flush();
      current = {
        title: titlePart || titleCandidate || line,
        description: [],
        dateRange,
        tags: parseTagsFromText(line),
        url,
      };
      continue;
    }

    if (!current) {
      current = {
        title: stripBulletPrefix(titlePart || titleCandidate || line),
        description: [],
        dateRange,
        tags: parseTagsFromText(line),
        url,
      };
      continue;
    }

    current.description.push(stripBulletPrefix(line));
    current.tags = uniqueStrings([...current.tags, ...parseTagsFromText(line)]);
    current.url ||= url;
  }

  flush();
  return uniqueItems(items).slice(0, limit);
}

function parseListItems(
  rawLines: string[],
  type: Extract<ProfileItemType, "certification" | "achievement">,
  limit: number,
) {
  const lines = usableSectionLines(rawLines);
  const items: CreateProfileItemInput[] = [];
  const hasBulletLines = lines.some((line) => isBulletLine(line));
  let current: {
    title: string;
    organization: string;
    description: string[];
    dateRange?: DateRange;
    startDate: string;
    endDate: string;
    tags: string[];
    url: string;
  } | null = null;

  function flush() {
    if (!current?.title) {
      current = null;
      return;
    }

    const repaired = repairWrappedTitle(current.title, current.description);

    items.push(
      makeItem({
        type,
        title: repaired.title,
        organization: current.organization,
        location: "",
        startDate: current.dateRange?.startDate ?? current.startDate,
        endDate: current.dateRange?.endDate ?? current.endDate,
        description: repaired.description.join("\n"),
        tags: current.tags,
        url: current.url,
      }),
    );
    current = null;
  }

  for (const line of lines) {
    const isNewEntry =
      isBulletLine(line) ||
      !current ||
      (!hasBulletLines && isHeaderCandidate(line));
    const parsed = parseListItemLine(line, type);

    if (isNewEntry) {
      flush();
      current = {
        ...parsed,
        description: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    current.description.push(stripBulletPrefix(line));
    current.tags = uniqueStrings([...current.tags, ...parseTagsFromText(line)]);
    current.url ||= findWebsite(line);
  }

  flush();
  return uniqueItems(items).slice(0, limit);
}

function parseListItemLine(
  line: string,
  type: Extract<ProfileItemType, "certification" | "achievement">,
) {
  const clean = stripBulletPrefix(line);
  const dateRange = findDateRange(clean);
  const singleDate = dateRange ? undefined : findSingleDate(clean);
  const url = findWebsite(clean);
  const withoutUrl = clean.replace(urlRegex, "").trim();
  const withoutDate = dateRange
    ? stripDateRange(withoutUrl)
    : singleDate
      ? withoutUrl.replace(singleDateRegex, "").trim()
      : withoutUrl;
  const parts = withoutDate
    .split(/\s+-\s+|\s+\|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const title = parts[0] || withoutDate || clean;
  const organization =
    type === "certification" ? parts.slice(1).join(" - ") : "";

  return {
    title: stripTrailingPunctuation(title),
    organization: stripTrailingPunctuation(organization),
    dateRange,
    startDate: singleDate ? normalizeDateText(singleDate) : "",
    endDate: "",
    tags: parseTagsFromText(clean),
    url,
  };
}

function findSingleDate(value: string) {
  return value.match(singleDateRegex)?.[0];
}

function repairWrappedTitle(title: string, description: string[]) {
  const remaining = [...description];
  let repairedTitle = title;

  while (repairedTitle.endsWith("-") && remaining[0]) {
    repairedTitle = `${repairedTitle.slice(0, -1)}${remaining.shift()}`;
  }

  return {
    title: repairedTitle,
    description: remaining,
  };
}

function parseSkillItems(rawLines: string[]) {
  const lines = usableSectionLines(rawLines);
  const items: CreateProfileItemInput[] = [];
  const aggregateTags: string[] = [];

  for (const line of lines) {
    const clean = stripBulletPrefix(line);
    const categoryMatch = clean.match(/^([A-Za-z][A-Za-z0-9 .+#/-]{1,38}):\s*(.+)$/);
    const category = categoryMatch?.[1]?.trim();
    const skillText = categoryMatch?.[2] ?? clean;
    const tags = parseSkillTags(skillText);

    if (category && tags.length > 0) {
      items.push(
        makeItem({
          type: "skill",
          title: limitText(category, 140),
          organization: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
          tags,
        }),
      );
      continue;
    }

    aggregateTags.push(...tags);
  }

  const uniqueAggregateTags = uniqueStrings(aggregateTags).slice(0, 20);

  if (uniqueAggregateTags.length > 0) {
    items.unshift(
      makeItem({
        type: "skill",
        title: "Technical skills",
        organization: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
        tags: uniqueAggregateTags,
      }),
    );
  }

  return uniqueItems(items).slice(0, 10);
}

function usableSectionLines(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line && !getSectionKey(line))
    .filter((line) => !/^[\W_]+$/.test(line));
}

function parseHeader(
  value: string,
  type: Extract<ProfileItemType, "experience" | "education">,
) {
  const parts = value
    .split(/\s+\|\s+|\s+@\s+|\s+-\s+|\s+ at\s+|,\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !looksLikeStandaloneDate(part));

  let title = parts[0] ?? "";
  let organization = parts[1] ?? "";
  let location = "";

  if (type === "experience" && looksLikeOrganization(title) && looksLikeRole(organization)) {
    [title, organization] = [organization, title];
  }

  if (type === "education" && looksLikeSchool(title) && looksLikeDegree(organization)) {
    [title, organization] = [organization, title];
  }

  const locationPart = parts.find((part) => looksLikeLocation(part));
  if (locationPart && locationPart !== title && locationPart !== organization) {
    location = locationPart;
  }

  return {
    title,
    organization,
    location,
  };
}

function findDateRange(line: string): DateRange | undefined {
  const range = line.match(dateRangeRegex);

  if (range) {
    return {
      startDate: normalizeDateText(range[1]),
      endDate: normalizeDateText(range[2]),
    };
  }

  const singleDate = line.match(singleDateRegex);

  if (!singleDate) {
    return undefined;
  }

  return {
    startDate: normalizeDateText(singleDate[1]),
    endDate: "",
  };
}

function stripDateRange(line: string) {
  return line
    .replace(dateRangeRegex, "")
    .replace(singleDateRegex, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[|,.-]+|[|,.-]+$/g, "")
    .trim();
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[|,.;:]+$/g, "").trim();
}

function normalizeDateText(value: string) {
  const trimmed = value.trim();
  return trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function looksLikeStandaloneDate(line: string) {
  const stripped = stripDateRange(line);
  return stripped.length === 0;
}

function isHeaderCandidate(line: string) {
  if (
    isBulletLine(line) ||
    isContactLine(line) ||
    getSectionKey(line) ||
    line.length > 140
  ) {
    return false;
  }

  return true;
}

function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line);
}

function stripBulletPrefix(line: string) {
  return line.replace(/^[-*]\s+/, "").trim();
}

function stripBullets(value: string) {
  return value
    .split("\n")
    .map(stripBulletPrefix)
    .join("\n")
    .trim();
}

function isContactLine(line: string) {
  return (
    emailRegex.test(line) ||
    /\+?\d[\d\s().-]{7,}/.test(line) ||
    /linkedin|github|portfolio|https?:\/\/|www\./i.test(line)
  );
}

function looksLikeLocation(line: string) {
  if (line.length > 80 || /\d{4}/.test(line)) {
    return false;
  }

  return (
    /\b(remote|hybrid|onsite)\b/i.test(line) ||
    /^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line) ||
    /\b(india|usa|united states|canada|uk|united kingdom|germany|france|australia|singapore|europe)\b/i.test(
      line,
    )
  );
}

function looksLikeRole(line: string) {
  return /\b(engineer|developer|designer|manager|lead|intern|analyst|consultant|architect|specialist|coordinator|researcher)\b/i.test(
    line,
  );
}

function looksLikeOrganization(line: string) {
  return /\b(inc|llc|ltd|pvt|limited|corp|company|labs|studio|systems|solutions|university|college|school|institute)\b/i.test(
    line,
  );
}

function looksLikeSchool(line: string) {
  return /\b(university|college|school|institute|academy|polytechnic)\b/i.test(
    line,
  );
}

function looksLikeDegree(line: string) {
  return /\b(bachelor|master|ph\.?d|b\.?tech|m\.?tech|b\.?e\.?|m\.?s\.?|b\.?s\.?|degree|diploma|computer science|engineering)\b/i.test(
    line,
  );
}

function parseSkillTags(value: string) {
  return uniqueStrings(
    value
      .split(/[,;|/]+|\s+-\s+|\s+and\s+/i)
      .map((tag) => tag.trim())
      .map((tag) => tag.replace(/[()]+/g, "").trim())
      .filter((tag) => tag.length >= 2 && tag.length <= 40)
      .filter((tag) => !findDateRange(tag))
      .filter((tag) => !/^(skills?|tools?|technologies)$/i.test(tag)),
  ).slice(0, 20);
}

function parseTagsFromText(value: string) {
  const techHint =
    /\b(react|next\.?js|node\.?js|typescript|javascript|python|java|mongodb|postgres|sql|aws|docker|kubernetes|tailwind|figma|graphql|rest|express|spring|django|flask|go|rust)\b/gi;
  const matches = value.match(techHint) ?? [];
  return uniqueStrings(matches).slice(0, 20);
}

function makeItem(input: CreateProfileItemInput): CreateProfileItemInput {
  return {
    type: input.type,
    title: limitText(input.title, 140),
    organization: limitText(input.organization ?? "", 140),
    location: limitText(input.location ?? "", 120),
    startDate: limitText(input.startDate ?? "", 80),
    endDate: limitText(input.endDate ?? "", 80),
    description: limitText(stripBullets(input.description ?? ""), 3000),
    url: input.url ?? "",
    tags: uniqueStrings(input.tags ?? []).slice(0, 20),
  };
}

function stripEmptyFields(profileBasics: Required<ProfileBasicsDraft>) {
  return Object.fromEntries(
    Object.entries(profileBasics).filter(([, value]) => value.trim()),
  ) as ProfileBasicsDraft;
}

function uniqueItems(items: CreateProfileItemInput[]) {
  const seen = new Set<string>();
  const result: CreateProfileItemInput[] = [];

  for (const item of items) {
    if (!item.title.trim()) {
      continue;
    }

    const key = [
      item.type,
      item.title,
      item.organization,
      item.startDate,
      item.endDate,
    ]
      .join("|")
      .toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function buildImportSummary(
  profileBasics: ProfileBasicsDraft,
  items: CreateProfileItemInput[],
) {
  const basicCount = Object.values(profileBasics).filter(Boolean).length;
  const itemCount = items.length;

  return `Parsed ${basicCount} basic fields and ${itemCount} profile items from the resume PDF.`;
}

function buildWarnings(
  text: string,
  profileBasics: ProfileBasicsDraft,
  items: CreateProfileItemInput[],
) {
  const warnings: string[] = [];

  if (text.length < 120) {
    warnings.push(
      "This PDF exposes very little selectable text. Scanned resumes need OCR for better extraction.",
    );
  }

  if (!profileBasics.displayName) {
    warnings.push("Could not confidently detect a name.");
  }

  if (items.length === 0) {
    warnings.push("No resume sections were detected for profile items.");
  }

  return warnings;
}

function limitText(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return trimmed.slice(0, maxLength - 1).trim();
}
