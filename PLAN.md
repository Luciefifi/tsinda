# Tsinda: project plan

> This is a living document. When a decision changes, update it here.
> Last updated: 2026-10-23

## 1. Why Tsinda exists

Tsinda helps my younger brother prepare for Rwanda's **Primary Leaving Examination (PLE)**. The goal is an **A (80% or more) in all five subjects** in July 2027.

After that, it will help my sister's child and children in our neighbourhood who sit the same exam. It's my first project for giving back to the community. **My brother always comes first**: anything for other students waits until it works for him.

*Tsinda* means "pass" or "win" in Kinyarwanda, as in *gutsinda ikizamini* (to pass an exam).

## 2. Key dates

| Date | What |
|---|---|
| 2026-10-23 | Planning starts |
| **December 2026** | My brother starts using Tsinda |
| **6–8 July 2027** | PLE 2027 (expected, from the 2026/27 school calendar; confirm with NESA) |

## 3. The exam we are preparing for

The exam has five papers. Each one lasts **2 hours** and is worth **100 marks**. Every paper is in English except Ikinyarwanda.

| Subject | Shape of the paper (2024–2025 papers) |
|---|---|
| Mathematics | About 33–35 questions: true/false, fill-in, multiple choice, matching, and longer problems with marks for working. No calculator. |
| English | A: Reading comprehension 20 · B: Vocabulary 25 · C: Language structure 40 · D: Composition 15 (≤150 words) |
| Ikinyarwanda | Kumva no gusesengura umwandiko 30 · Ikibonezamvugo 25 · Ubumenyi rusange bw'ururimi 30 · Ihangamwandiko 15 |
| SET (Science and Elementary Technology) | 50 questions, 1–4 marks each |
| SRS (Social and Religious Studies) | 50 questions × 2 marks. The religion questions offer a Christian version and an Islamic version, and the student answers one. |

**Grades since November 2024:**

| Grade | Score |
|---|---|
| A | 80–100 |
| B | 75–79 |
| C | 70–74 |
| D | 65–69 |
| E | 60–64 |
| S | 50–59 (minimum pass) |
| F | below 50 |

**Things to keep in mind:**
- **2027 may change a little.** The new 2026 curriculum may add *functional writing* (letters, messages) to English.
- **Maths is the weakest subject nationally.**
- **Poor English makes Maths and SET harder.** Examiners name it as a reason students fail.

Sources and links are in [content/sources/README.md](content/sources/README.md).

## 4. How a student learns with Tsinda

Tsinda is a **learning** app, not just a question bank. Every session is **learn first, then check**.

1. **Warm-up.** A few quick questions from earlier topics, so he doesn't forget them.
2. **Lesson.** One small topic from the P6 curriculum: a short explanation in **very simple English**, worked examples and pictures.
3. **Check.** Questions on that topic, marked straight away. Every wrong answer shows why it is wrong.
4. **Result.** A topic score. Below 80%, the topic comes back soon. At 80% or more, it moves on.
5. **Mock exams.** Every few weeks, a full mock in the real PLE format.

Other rules:
- **Weekday sessions are short and weekend sessions are longer.** Days, times and lengths are all **settings in the app**, never hard-coded.
- **Language.** Everything we write uses very simple English: lessons, explanations, buttons and messages. **Past-paper questions keep their real exam wording**, because he must learn to read real exam English. A Kinyarwanda word helper (tap a hard word to see its meaning) is an idea for later.
- **Format.** Reading only for now (text and pictures). Audio and video may come later.
- **Device.** Dad's phone first, so the app is designed phone-first. It must also work well on a tablet.

## 5. Content

### Where it comes from

- **Questions.** Official NESA past papers first. Questions written to match the official format fill the gaps.
- **Answers.** NESA does not publish marking guides, so we write the answers ourselves, carefully. **My sister, who is a teacher, reviews them.** Answers never come from an AI without being checked.
- **Lessons.** These follow the REB 2026 P4–P6 syllabi and P6 books, rewritten as short, simple, screen-friendly lessons.
- **Structure.** Subject → Unit → Topic → Lesson + Questions. Topics come from the REB 2026 syllabus. P4 and P5 topics count too, because the PLE tests all of upper primary.

### How it flows into the app

```
content/sources/            content/lessons/ + content/questions/        Database
(NESA + REB PDFs)     →     (Markdown + JSON we write, reviewed)    →    (the app reads here)
reference only               committed to git                             loaded by a seed script
```

- **PDFs are reference only.** They are not deployed, and are not committed to git, because they're big and can be re-downloaded.
- **Lessons and questions are files in git.** That gives us history, review and easy fixes. A seed script loads them into the database.
- **The database holds runtime data:** students, answers, scores, sessions and settings.

### RAG

Not needed. Content is labelled by topic, so the app finds what it needs with normal database queries. A future "explain my mistake" AI feature gets its context the same way. RAG would only matter for an open "ask anything" chat, if we ever build one.

## 6. People and roles

Tsinda is **invite only**: the admin adds every family. Roles are fixed in the code. People and their roles are managed in the app, and one person can have several roles.

| Role | Can do | First person |
|---|---|---|
| Admin | Everything: people, roles, settings, schedule | Me |
| Student | Study, answer, take mock exams. Sees only their own work | My brother |
| Guardian | Sees their own children's progress and gets reminders | Dad |
| Reviewer | Checks and corrects lessons, questions and answers | My sister |

**Privacy.** We hold data about other people's children, and Rwanda's data protection law (Law No. 058/2021) applies. So we:
- collect only what is needed;
- get a parent's OK before adding a child;
- never show one family another family's results;
- keep secrets (API keys, passwords) out of the code.

## 7. Reminders

Reminders are sent in **Kinyarwanda**, for example:

> *"Muraho! Ni igihe cyo guha telefoni [izina] ngo yige kuri Tsinda."*

There are two channels, built behind one "send reminder" interface:

| Channel | Notes |
|---|---|
| **SMS** (Africa's Talking) | Main channel. Works on any phone. Small cost per message. Free sandbox for development. |
| **Push notifications** (web push, PWA) | Free. Needs a smartphone with the app on the home screen. |

Who gets which reminder, on which channel and when, is **data in the database**. This matters because a student with their own tablet could later get reminders directly.

## 8. Tech stack

| Part | Choice |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind CSS: one full-stack repo |
| Database | **PostgreSQL** |
| ORM | **Prisma 7** (driver adapter `@prisma/adapter-pg`) |
| Architecture | **Service layer**: business logic in `server-only` services, thin pages, actions and route handlers (details to agree) |
| SMS | Africa's Talking |
| Push | Web Push API + service worker (PWA) |
| Hosting | *To choose*, probably Vercel + a hosted Postgres (Neon or Supabase) |

## 9. How we work

- **I write the code myself, to learn as much as possible.** Claude explains, we think each piece through together, Claude gives the code in small chunks, and I type it in. Claude writes code directly only where I ask.
- **Decisions are made one at a time** and recorded in this file.

## 10. First database sketch (draft)

```
people            name, phone, PIN or password
roles             admin, student, guardian, reviewer
person_roles      who has which role
guardianships     which guardian follows which student

subjects → units → topics
lessons           belongs to a topic
questions         belongs to a topic; type, marks, answer, explanation, source (e.g. "NESA 2024 Q12")

study_sessions    a student's session: when, how long, which topics
answers           what the student answered, marks given
topic_progress    a student's score per topic, when to review next

schedules         per student: days, times, session lengths
reminder_rules    who is reminded, channel, when
```

### Database conventions (agreed 2026-10-24)

Check every model against these rules.

1. **Normalize to 3NF.** Store every fact once and refer to it by foreign key. No lists packed into a column. A column depends on the whole key and nothing else.
2. **Denormalize only on purpose, with a schema comment explaining why.** Two allowed cases:
   - historical snapshots, e.g. marks awarded at answer time;
   - derived caches, e.g. `TopicProgress`, updated in the same transaction as the source rows.
3. **Keys.** Primary keys are UUIDv7 (`@default(uuid(7))` with `@db.Uuid`). Natural uniqueness is enforced with unique constraints.
4. **Integrity lives in the database.**
   - Columns are NOT NULL unless "unknown" is a real state.
   - Every foreign key has an explicit `onDelete` rule (`Cascade`, `Restrict` or `SetNull`).
   - Fixed sets are enums.
   - Rules like ranges are CHECK constraints, added by hand to the migration SQL.
5. **Indexes.** Index every foreign key, since PostgreSQL and Prisma don't do it automatically. Add composite indexes for real query patterns.
6. **Naming.** `snake_case` in the database and `camelCase` in TypeScript, joined with `@map` and `@@map`.
7. **Time.** Store `timestamptz` in UTC and convert to Kigali time (UTC+2) for display. Every table has `createdAt`, plus `updatedAt` where rows change.
8. **Safety.**
   - Every change is a committed migration, and a migration that has already run is never edited.
   - Multi-step writes run in transactions.
   - The app connects as the `tsinda` role, never as `postgres`.
   - Passwords and PINs are stored only as hashes.
   - Children's data is hard-deleted when a family leaves. `isActive` pauses an account.

## 11. Build order (draft, to be confirmed)

| Phase | What | Target |
|---|---|---|
| 0 | Set up PostgreSQL + ORM, first tables, seed script | Early Nov |
| 1 | Content format + first Maths topics written and reviewed | Nov (continues all year) |
| 2 | Login (PIN for students, password for admin) + roles | Nov |
| 3 | Session flow: lesson → check → result | Nov |
| 4 | Progress dashboard for admin and guardians | Late Nov |
| 5 | Schedule settings + SMS reminders | Late Nov |
| 6 | Deploy, then my brother starts | **December** |
| 7 | Push notifications (PWA) | Dec–Jan |
| 8 | Mock exams in PLE format, spaced review of weak topics | Jan–Feb |
| 9 | More students: my sister's child, then neighbours | When it works well for my brother |
| Later | AI "explain my mistake", Kinyarwanda word helper, audio | — |

## 12. Open decisions

- [x] ORM: Prisma
- [ ] Service layer details: folder layout, how services receive the current user, validation
- [ ] Database hosting: Neon, Supabase, or another host; and how to run Postgres locally
- [ ] Login details: PIN length, sessions, password rules
- [ ] Final build order and dates
- [ ] Monthly budget (SMS, hosting, AI)
- [ ] Commit the source PDFs to git or not (currently ignored)
- [ ] Ask my sister for marking guides and P6 mock exams, and agree how she reviews content

## 13. Decision log

| Date | Decision |
|---|---|
| 2026-10-23 | Single full-stack Next.js repo |
| 2026-10-23 | Reminders by both SMS and push |
| 2026-10-23 | I write the code (mentor mode); start moved to December 2026 |
| 2026-10-23 | No past papers at hand: use NESA's online papers; sister (teacher) reviews |
| 2026-10-23 | Learn-then-assess sessions; weekday/weekend lengths; dynamic schedule |
| 2026-10-23 | Lessons: REB textbooks rewritten simply; reading only for now |
| 2026-10-23 | Very simple English everywhere except real exam questions |
| 2026-10-23 | Content in files (git) → seed → database; PDFs reference only; no RAG |
| 2026-10-23 | Many students, fixed roles + dynamic people, invite only; brother first |
| 2026-10-23 | Database: PostgreSQL |
| 2026-10-23 | ORM: Prisma |
| 2026-10-23 | Architecture: service layer |
| 2026-10-24 | Prisma 7 (stable), not the Prisma 8 RC; dev database `tsinda` in local PostgreSQL 14 (port 5432) |
| 2026-10-24 | One `User` table + `UserRole` + `StudentProfile` + `Guardianship` (normalized) |
| 2026-10-24 | Database conventions adopted (section 10) |
| 2026-10-24 | Student login: username + 4-digit PIN, remember device, lockout; adults: phone + password; "who is learning?" picker later |
