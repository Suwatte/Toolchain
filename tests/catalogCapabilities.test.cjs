const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  createCatalogManifest,
  offersDownloads,
  readCatalogCapabilities,
} = require("../dist/pipeline/catalog");

test("catalog badges come from declared methods without running the source", async () => {
  class Base {
    async getChapterText() {}
  }
  class Everything extends Base {
    async clearAuthentication() {}
    async synchronizeLibrary() {}
    async getTrackEntryPage() {}
    async getContentProgress() {}
    async getSetupState() {}
  }
  class Plain {
    // Configuration can't claim a badge.
    getConfiguration() {
      return { librarySyncProviding: true };
    }
  }
  class Throws {
    constructor() {
      throw new Error("never constructed");
    }
    get getChapterText() {
      throw new Error("never read");
    }
    async handleOAuthCallback() {}
  }

  assert.deepEqual(readCatalogCapabilities(Everything), [
    "signIn",
    "librarySync",
    "progressSync",
    "resumesProgress",
    "novels",
    "setup",
  ]);
  assert.deepEqual(readCatalogCapabilities(Plain), []);
  assert.deepEqual(readCatalogCapabilities(Throws), ["signIn"]);

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-badges-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "list" }),
  );
  const variant = (id, capabilities) => ({
    sourceId: id,
    variantId: id,
    artifactId: id,
    entryPath: "/tmp/x.js",
    environment: "jsc",
    usesHttpClient: false,
    metadata: {
      id,
      name: id,
      version: 1,
      website: "https://example.com",
      rating: 0,
      languages: ["en"],
    },
    capabilities,
  });
  const claimed = variant("b", []);
  claimed.metadata.capabilities = ["novels"];
  const { sources } = createCatalogManifest(root, [
    variant("a", ["novels"]),
    claimed,
  ]);
  assert.deepEqual(sources[0].capabilities, ["novels"]);
  assert.equal("capabilities" in sources[1], false);
});

test("downloads come from acquisitions in the source's own files, not its tests", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-downloads-"));
  const source = async (name, files) => {
    const dir = path.join(root, name);
    await fs.mkdir(dir);
    for (const [file, text] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, file), text);
    }
    return path.join(dir, "index.ts");
  };
  const books = await source("books", {
    "index.ts": "export * from './chapters';",
    "chapters.ts": "return [{ id: 'book', acquisitions: files }];",
  });
  const plain = await source("plain", {
    "index.ts": "export class Source {}",
    "plain.test.ts":
      "expect(chapter.acquisitions).toBeUndefined(); const c = { acquisitions: [] };",
  });
  assert.equal(offersDownloads(books), true);
  assert.equal(offersDownloads(plain), false);
});
