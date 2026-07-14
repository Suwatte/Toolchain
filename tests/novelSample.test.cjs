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
const legacyRoot = path.join(sampleRoot, "legacy-v7");
const legacyDist = path.join(legacyRoot, "dist");

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
  await fs.rm(legacyDist, { recursive: true, force: true });
  try {
    await execFileAsync(
      process.execPath,
      [path.join(toolchainRoot, "bin", "suwatte.js"), "build"],
      { cwd: sampleRoot },
    );
    await execFileAsync(
      process.execPath,
      [path.join(toolchainRoot, "bin", "suwatte.js"), "build"],
      { cwd: legacyRoot },
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

    const legacyManifest = JSON.parse(
      await fs.readFile(path.join(legacyDist, "sources.json"), "utf8"),
    );
    assert.equal(legacyManifest.sources.length, 1);
    const legacyMetadata = legacyManifest.sources[0];
    const currentJSC = manifest.sources.find(
      (source) => source.environment === "jsc",
    );
    assert.equal(legacyMetadata.id, currentJSC.id);
    assert.equal(legacyMetadata.version, 0.9);
    assert.equal(legacyMetadata.minSupportedAppVersion, undefined);

    const { sourcePackage: legacyPackage } = await executeArtifact(
      path.join(legacyDist, "sources", `${legacyMetadata.path}.stt`),
    );
    const legacySource = legacyPackage.bootstrap();
    assert.equal(typeof legacySource.getChapterContent, "undefined");
    assert.equal(typeof legacySource.getChapterPages, "function");

    const legacyChapters = await legacySource.getChapters("controlled-novel");
    const currentPackage = await executeArtifact(
      path.join(sampleDist, "sources", `${currentJSC.path}.stt`),
    );
    const currentSource = currentPackage.sourcePackage.bootstrap();
    const currentChapters = await currentSource.getChapters("controlled-novel");
    assert.deepEqual(
      JSON.parse(JSON.stringify(legacyChapters.map((chapter) => chapter.id))),
      JSON.parse(JSON.stringify(currentChapters.map((chapter) => chapter.id))),
    );

    const pages = await legacySource.getChapterPages(
      "controlled-novel",
      "html-chapter",
    );
    assert.equal(pages.length, 1);
    assert.ok(Buffer.from(pages[0].b64, "base64").length > 0);
  } finally {
    await fs.rm(sampleDist, { recursive: true, force: true });
    await fs.rm(legacyDist, { recursive: true, force: true });
  }
});
