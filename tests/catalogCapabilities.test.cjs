const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  createCatalogManifest,
  readCatalogCapabilities,
} = require("../dist/pipeline/catalog");

test("catalog badges come from the source's own methods, including class fields", async () => {
  class Everything {
    async clearAuthentication() {}
    async synchronizeLibrary() {}
    async getTrackEntryPage() {}
    getChapterText = async () => "";
  }
  class Plain {
    // Configuration can't claim a badge.
    getConfiguration() {
      return { librarySyncProviding: true };
    }
  }
  class Throws {
    constructor() {
      throw new Error("needs args");
    }
  }
  Throws.prototype.handleOAuthCallback = async () => {};

  assert.deepEqual(readCatalogCapabilities(Everything), [
    "signIn",
    "librarySync",
    "progressSync",
    "novels",
  ]);
  assert.deepEqual(readCatalogCapabilities(Plain), []);
  assert.deepEqual(readCatalogCapabilities(Throws), ["signIn"]);

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-badges-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "list" }));
  const variant = (id, capabilities) => ({
    sourceId: id,
    variantId: id,
    artifactId: id,
    entryPath: "/tmp/x.js",
    environment: "jsc",
    usesHttpClient: false,
    metadata: { id, name: id, version: 1, website: "https://example.com", rating: 0, languages: ["en"] },
    capabilities,
  });
  const { sources } = createCatalogManifest(root, [variant("a", ["novels"]), variant("b", [])]);
  assert.deepEqual(sources[0].capabilities, ["novels"]);
  assert.equal("capabilities" in sources[1], false);
});
