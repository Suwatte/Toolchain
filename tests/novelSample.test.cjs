const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const toolchainRoot = path.resolve(__dirname, "..");
const sampleRoot = path.join(toolchainRoot, "examples", "novel-source");
const sampleDist = path.join(sampleRoot, "dist");

const {
  validateDelegateMethodResult,
  validateSourcePublicationContract,
} = require("../dist/validate");

const executeArtifact = async (filePath) => {
  const script = await fs.readFile(filePath, "utf8");
  const context = vm.createContext({ console });
  vm.runInContext(script, context, { filename: filePath, timeout: 5_000 });
  return { script, sourcePackage: context.SourcePackage };
};

test("controlled novel sample builds and runs as sibling JSC and WebKit artifacts", async () => {
  await fs.rm(sampleDist, { recursive: true, force: true });
  try {
    await execFileAsync(
      process.execPath,
      [path.join(toolchainRoot, "bin", "suwatte.js"), "build"],
      { cwd: sampleRoot },
    );

    const manifest = JSON.parse(
      await fs.readFile(path.join(sampleDist, "sources.json"), "utf8"),
    );
    assert.equal(manifest.sources.length, 2);
    assert.deepEqual(
      manifest.sources.map((source) => source.environment).sort(),
      ["jsc", "webkit"],
    );
    assert.ok(
      manifest.sources.every(
        (source) => source.minSupportedAppVersion === "7.1",
      ),
    );

    const results = [];
    for (const metadata of manifest.sources) {
      const artifactPath = path.join(
        sampleDist,
        "sources",
        `${metadata.path}.stt`,
      );
      const { script, sourcePackage } = await executeArtifact(artifactPath);
      assert.ok(sourcePackage);
      assert.equal(sourcePackage.SourceMetadata.minSupportedAppVersion, "7.1");
      assert.equal(
        script.slice(0, 512).includes('"use webkit"'),
        metadata.environment === "webkit",
      );

      const source = sourcePackage.bootstrap();
      const configuration = source.getConfiguration();
      validateSourcePublicationContract(metadata, configuration, source);
      assert.equal(typeof source.getChapterPages, "undefined");

      const html = validateDelegateMethodResult(
        "getChapterContent",
        await source.getChapterContent("controlled-novel", "html-chapter"),
        metadata.environment,
      );
      const plainText = validateDelegateMethodResult(
        "getChapterContent",
        await source.getChapterContent("controlled-novel", "plain-text-chapter"),
        metadata.environment,
      );
      results.push(JSON.stringify({ html, plainText }));

      await assert.rejects(
        source.getChapterContent("controlled-novel", "locked-chapter"),
        (error) => error && error.name === "ChapterLocked",
      );
      await assert.rejects(
        source.getChapterContent("controlled-novel", "missing"),
        (error) => error && error.name === "ChapterUnavailable",
      );
    }

    assert.equal(results[0], results[1]);
  } finally {
    await fs.rm(sampleDist, { recursive: true, force: true });
  }
});
