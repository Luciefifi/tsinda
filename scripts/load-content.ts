// Loads the content files into the database and prints a coverage report.
// Usage:
//   npm run content:load                  loads content/
//   npm run content:load -- some/folder   loads another folder (e.g. a test fixture)
import path from "node:path";
import { loadContent, type LoadReport } from "@/server/content/load-content";
import { ContentError, readContent } from "@/server/content/read-content";
import { prisma } from "@/server/db";

async function main() {
  const contentDir = path.resolve(process.argv[2] ?? "content");

  let content;
  try {
    content = readContent(contentDir);
  } catch (error) {
    if (!(error instanceof ContentError)) throw error;
    console.error(`✖ ${error.message} Nothing was saved.\n`);
    for (const problem of error.problems) {
      console.error(`  ${problem.file}\n    ${problem.message}`);
    }
    process.exitCode = 1;
    return;
  }

  printReport(await loadContent(prisma, content));
}

function printReport(report: LoadReport) {
  console.log(`✔ Content loaded: ${report.created} new, ${report.updated} changed, ${report.unchanged} unchanged.`);

  if (report.sentBackToDraft.length > 0) {
    console.log(`\n⚠ Changed after being published, so back to draft for review:`);
    for (const key of report.sentBackToDraft) console.log(`  ${key}`);
  }
  if (report.missingFromFiles.length > 0) {
    console.log(`\n⚠ In the database but no longer in the files (not deleted):`);
    for (const key of report.missingFromFiles) console.log(`  ${key}`);
  }

  console.log("\nCoverage");
  for (const unit of report.units) {
    const sources = Object.entries(unit.questionsBySource)
      .map(([source, count]) => `${source} ${count}`)
      .join(", ");
    console.log(`  ${unit.subjectKey} P${unit.grade} Unit ${unit.number}: ${unit.title}`);
    console.log(`    ${unit.topics} topics, ${unit.lessons} lessons, questions: ${sources || "none"}, ${unit.marks} marks`);
    if (unit.needsPicture.length > 0) {
      console.log(`    needs a picture: ${unit.needsPicture.join(", ")}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
