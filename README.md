# Tsinda

**Learn, practise, pass.** Tsinda is a study app for Rwandan Primary 6 pupils preparing for the national **Primary Leaving Examination (PLE)**.

*Tsinda* is Kinyarwanda for "pass" or "win", as in *gutsinda ikizamini* (to pass an exam).

> **Status: planning and early setup.** The app does not work yet. See [PLAN.md](PLAN.md) for the full plan and the decisions made so far.

---

## Why

Tsinda started as a way to help one boy, my younger brother, get an A in every PLE subject in July 2027. It will then open to family and neighbours whose children sit the same exam, as a small way of giving back to the community.

Three things shape the app:

- **Weak English is a real barrier.** Examiners say many pupils lose marks in Maths and Science because they struggle to read the questions. So Tsinda explains everything in **very simple English**, and it trains pupils to read real exam questions.
- **Practice must match the real exam.** Questions come from official NESA past papers, and lessons follow the official REB curriculum.
- **Children study on a parent's phone.** Reminders go to the parent, in Kinyarwanda, when it's time to hand over the phone.

## What it will do

### For the pupil
- **Learn, then check.** Each session teaches one topic in a short, simple lesson, then asks questions on that topic. Answers are marked straight away, and every mistake is explained.
- **Review.** Each session starts with a warm-up on earlier topics, so nothing is forgotten.
- **Mock exams.** Full mock exams follow the real PLE format: five papers, each 2 hours and 100 marks.
- **All five subjects:** Mathematics, English, Ikinyarwanda, Science and Elementary Technology (SET), and Social and Religious Studies (SRS).

### For families
- **Reminders** by SMS and phone notification, in Kinyarwanda, following a schedule each family sets.
- **Progress.** Guardians can see how their own child is doing: topics mastered, weak topics, and session history.

### For the people running it
- **Invite only.** An admin adds each family.
- **Roles.** People can be an **admin**, **student**, **guardian** or **reviewer**, and one person can have several roles.
- **Review.** Reviewers (teachers) check lessons, questions and answers before pupils see them.

## Built with

| Part | Technology |
|---|---|
| App | [Next.js 16](https://nextjs.org) (App Router) with TypeScript |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Database | [PostgreSQL](https://www.postgresql.org) |
| ORM | [Prisma](https://www.prisma.io) |
| SMS | [Africa's Talking](https://africastalking.com) (planned) |
| Notifications | Web Push in a Progressive Web App (planned) |

## Getting started

### What you need
- [Node.js](https://nodejs.org) 20.9 or newer (developed on Node 22)
- npm, which comes with Node.js
- PostgreSQL: not needed yet. Setup steps will be added when the database is connected.

### Run it locally

```bash
git clone https://github.com/Luciefifi/tsinda.git
cd tsinda
npm install
npm run dev
```

Then open <http://localhost:3000>.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server, which reloads when you save a file |
| `npm run build` | Builds the app for production |
| `npm run start` | Runs the production build |
| `npm run lint` | Checks the code with ESLint |

## Project structure

```
tsinda/
├── src/app/            # Pages and API routes (Next.js App Router)
├── public/             # Static files: images, icons
├── content/
│   └── sources/        # Official NESA and REB documents, for reference only
├── PLAN.md             # The project plan and decision log
└── AGENTS.md           # Notes for AI coding assistants
```

More folders will appear as the app grows. Two are planned: `content/lessons/` and `content/questions/`, holding the lessons and questions in a format the app can load.

## Content and sources

Tsinda's content is built from official, public documents:

- **NESA past papers** (P6, 2019 and 2021–2025): https://www.nesa.gov.rw/1/resources
- **REB 2026 P4–P6 syllabi and P6 schemes of work**: https://elearning.reb.rw/course/view.php?id=1806

These PDFs are kept locally in [content/sources/](content/sources/) as reference material. They are **not committed to git** and **not served by the app**: lessons and questions are written from them.

NESA does not publish marking guides, so **every answer in Tsinda is written by hand and checked by a teacher**. Answers are never taken from an AI without review.

Tsinda is an independent family and community project. It is **not affiliated with NESA, REB or the Ministry of Education**.

## Privacy

Tsinda holds information about children, so it follows Rwanda's data protection law (Law No. 058/2021):

- it collects only what it needs;
- a parent agrees before their child is added;
- each family sees only their own children's results;
- secrets (API keys, passwords) live in environment variables, never in the code.

## Roadmap

The detailed plan is in [PLAN.md](PLAN.md). In short:

1. **Foundation:** database, login, roles.
2. **Learning loop:** lesson → check → result, starting with Mathematics.
3. **Families:** progress dashboard, schedule, SMS reminders.
4. **Launch for my brother:** December 2026.
5. **Then:** push notifications, mock exams, spaced review, more students.
6. **Later ideas:** AI explanations of mistakes, a Kinyarwanda word helper, audio lessons.

## Licence

Not chosen yet.
