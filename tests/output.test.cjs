const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  copyAssetsIfPresent,
} = require("../dist/pipeline/output");
const { createBuildPaths } = require("../dist/pipeline/paths");
const { generateHTML } = require("../dist/utils/generateHTML");

test("catalog output uses the documented layout and preserves nested assets", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-output-"));
  const paths = createBuildPaths({}, root);
  assert.equal(paths.outDir, path.join(root, "dist"));
  assert.equal(paths.outSourcesDir, path.join(root, "dist", "sources"));

  await fs.mkdir(path.join(root, "assets", "covers"), { recursive: true });
  await fs.writeFile(path.join(root, "assets", "covers", "sample.txt"), "cover");
  await fs.mkdir(paths.outDir, { recursive: true });

  await copyAssetsIfPresent(root, paths.outDir);
  await generateHTML(paths.outDir);

  assert.equal(
    await fs.readFile(
      path.join(paths.outDir, "assets", "covers", "sample.txt"),
      "utf8",
    ),
    "cover",
  );
  for (const fileName of ["index.html", "main.css", "catalog.js"]) {
    await assert.doesNotReject(fs.access(path.join(paths.outDir, fileName)));
  }
});
