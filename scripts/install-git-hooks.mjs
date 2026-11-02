// Runs after `npm install` (the "prepare" script): tells git to use the hooks
// in .githooks/. Skipped quietly where there is no git, e.g. some build servers.
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Not a git checkout: nothing to install.
}
