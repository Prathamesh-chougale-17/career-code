# Warm Referral LinkedIn Job Hunt Prompt

## Daily Prompt

Run today's warm-referral job hunt for me.

Find 10-15 high-fit backend, full-stack, software engineer, or AI product engineer jobs for my profile. Prioritize recent LinkedIn roles and roles where there is a reachable person I can message before applying.

Do not auto-apply, auto-connect, or auto-send messages. Draft only.

If Careeright tools are available, save shortlisted jobs and warm-apply contact drafts into Careeright.

## My Target

- Roles: Backend Engineer, Full Stack Engineer, Software Engineer, AI/LLM Product Engineer
- Stack: Node.js, TypeScript, React/Next.js, MongoDB, PostgreSQL, APIs, AI tools
- Locations: Pune, Bengaluru, Hyderabad, Remote India, or strong remote global roles
- Level: early-career, 0-3 years, junior-mid friendly
- Prefer: product companies, startups, AI/SaaS/product engineering teams, roles with backend ownership
- Avoid: senior-only roles, unpaid roles, commission-only roles, frontend-only roles, vague agencies, roles requiring 5+ years

## Search Strategy

1. Search recent jobs from LinkedIn and other high-signal sources.
2. Prefer jobs posted in the last 7-14 days.
3. Prefer clear stack matches, low applicant count, real product/team ownership, and reachable people.
4. Score each job from 0-100 for fit.
5. Shortlist only jobs with fit score >= 75 unless there is a very strong referral angle.
6. For each shortlisted job, find 1-3 LinkedIn people to contact.
7. Prioritize contacts in this order:
   - Job poster
   - Recruiter or talent partner
   - Hiring manager
   - Founder
   - Engineering manager
   - Backend/full-stack engineer at the company
   - HR or relevant employee

## Output For Every Shortlisted Job

Return:

- Role
- Company
- Location/work mode
- Apply URL/job URL
- Fit score
- Why this is a fit
- Risks or red flags
- Best LinkedIn contact(s)
- Contact priority: best_first, backup, or low_confidence
- Suggested warm-apply status
- Follow-up due date
- Draft LinkedIn connection note
- Draft first message after they accept
- Draft follow-up message after 4 days

## Message Strategy

- Do not immediately ask "please refer me."
- Start with a specific, respectful note about the role or team.
- Ask for 1-2 quick pointers, or ask whether sharing my resume is okay.
- Keep connection notes short enough for LinkedIn.
- Keep messages natural, specific, and calm.
- Do not sound desperate or generic.

## Careeright Update Instructions

If Careeright tools are available:

- Save shortlisted jobs.
- Keep normal job status as `not_applied` until I actually apply.
- Set `warmApplyStatus` to `draft_ready`.
- Add `referralContacts` with:
  - name
  - title
  - company
  - LinkedIn URL
  - relationship
  - priority
  - outreachStatus
  - draftMessage
  - followUpDueAt
  - notes

## Final Output Format

1. Ranked table of 10-15 best jobs.
2. Top 5 jobs I should act on today.
3. Ready-to-copy LinkedIn drafts for each top contact.
4. Short action plan for today.

## Safety Rule

Never send a connection request, LinkedIn message, email, application, or referral request automatically. Prepare drafts and ask me before any external action.
