import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

// Runs once before all tests: refuse to touch a database that isn't a test
// database, then bring it up to date and seed roles and permissions.
export default function globalSetup(project: TestProject) {
  // The same variables the tests get (from .env.test locally, CI otherwise).
  const env = { ...process.env, ...project.config.env };

  const databaseName = new URL(env.DATABASE_URL ?? "postgresql://missing/").pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    const message =
      `Tests only run against a database whose name ends in "_test", not "${databaseName}". ` +
      "Set DATABASE_URL in .env.test.";
    // Printed as well as thrown: Vitest 5 can hide errors thrown here.
    console.error(message);
    throw new Error(message);
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx prisma db seed", { stdio: "inherit", env });
}
