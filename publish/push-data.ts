// Pushes out/* to Axelstar/halkvakt-karta:data/ as ONE commit via the Git Data API.
// Exists because git-over-HTTPS from Actions runners 403s with a token the REST
// API accepts (see docs/RUNBOOK.md "known weirdness"). API works; we use the API.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const token = process.env.PUBLISH_TOKEN;
if (!token) { console.error("PUBLISH_TOKEN not set"); process.exit(1); }
const REPO = "Axelstar/halkvakt-karta";
const dir = process.argv[2] ?? "out";

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const branch = await gh("/branches/main");
const baseCommit = branch.commit.sha;
const baseTree = branch.commit.commit.tree.sha;

const files = readdirSync(dir);
const entries = [];
for (const f of files) {
  const blob = await gh("/git/blobs", "POST", {
    content: readFileSync(join(dir, f)).toString("base64"), encoding: "base64" });
  entries.push({ path: `data/${f}`, mode: "100644", type: "blob", sha: blob.sha });
}
const tree = await gh("/git/trees", "POST", { base_tree: baseTree, tree: entries });
if (tree.sha === baseTree) { console.log("no changes"); process.exit(0); }
const commit = await gh("/git/commits", "POST", {
  message: `data: ${new Date().toISOString()}`, tree: tree.sha, parents: [baseCommit] });
await gh("/git/refs/heads/main", "PATCH", { sha: commit.sha });
console.log(`pushed ${files.length} files as ${commit.sha.slice(0, 7)}`);
