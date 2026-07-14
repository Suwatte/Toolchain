const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  detectHttpClientDirective,
  detectSourceEnvironment,
  discoverSources,
  findUnsupportedWebKitAPIs,
} = require("../dist/pipeline/discoverSources");
const { bundleSources } = require("../dist/pipeline/bundleSources");
const {
  createCatalogManifest,
  writeVariantWrappers,
} = require("../dist/pipeline/catalog");

test("directive detection is byte-limited and WebKit validation is syntax-aware", async () => {
  assert.equal(detectSourceEnvironment('"use webkit";'), "webkit");
  assert.equal(
    detectSourceEnvironment(" ".repeat(512) + '"use webkit";'),
    "jsc",
  );
  assert.equal(detectHttpClientDirective('"use httpclient";'), true);
  assert.equal(
    detectHttpClientDirective(" ".repeat(512) + '"use httpclient";'),
    false,
  );

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-webkit-"));
  await fs.writeFile(
    path.join(directory, "index.ts"),
    '"use webkit";\nconst label = "HttpClient";\nnew HttpClient();',
  );
  assert.deepEqual(await findUnsupportedWebKitAPIs(directory), ["HttpClient"]);
});

test("HttpClient opt-in is inferred from usage or declared explicitly", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-httpclient-"));
  const compiled = path.join(root, "compiled");
  const sources = path.join(root, "sources");

  const writeSource = async (id, entrySource) => {
    await fs.mkdir(path.join(compiled, id), { recursive: true });
    await fs.mkdir(path.join(sources, id), { recursive: true });
    await fs.writeFile(path.join(compiled, id, "index.js"), "module.exports = {};");
    await fs.writeFile(path.join(sources, id, "index.ts"), entrySource);
  };

  await writeSource("uses-client", "const client = new HttpClient({});");
  await writeSource("declares-client", '"use httpclient";\nconst legacy = 1;');
  await writeSource("legacy", "const client = new NetworkClient();");

  const discovered = await discoverSources(compiled, sources);
  const byId = Object.fromEntries(discovered.map((s) => [s.id, s.usesHttpClient]));
  assert.deepEqual(byId, {
    "uses-client": true,
    "declares-client": true,
    legacy: false,
  });
});

test("source discovery rejects JSC-only APIs in WebKit sources", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-discovery-"));
  const compiled = path.join(root, "compiled");
  const sources = path.join(root, "sources");
  await fs.mkdir(path.join(compiled, "demo"), { recursive: true });
  await fs.mkdir(path.join(sources, "demo"), { recursive: true });
  await fs.writeFile(path.join(compiled, "demo", "index.js"), "module.exports = {};");
  await fs.writeFile(
    path.join(sources, "demo", "index.ts"),
    '"use webkit";\nconst canvas = new NativeCanvas(1, 1);',
  );

  await assert.rejects(
    discoverSources(compiled, sources),
    /JSC-only APIs in a WebKit build: NativeCanvas/,
  );
});

test("v5 catalog, wrapper, and artifact inputs carry directives", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "suwatte-stamp-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "test-list" }),
  );
  const makeVariant = (overrides) => ({
    sourceId: "demo",
    variantId: "en.demo.test",
    artifactId: "demo",
    entryPath: "/tmp/demo.js",
    environment: "jsc",
    usesHttpClient: false,
    metadata: {
      id: "en.demo.test",
      name: "Demo",
      version: 1,
      website: "https://example.com",
      rating: 0,
      languages: ["en"],
    },
    ...overrides,
  });

  const webkitVariant = makeVariant({ environment: "webkit" });
  const manifest = createCatalogManifest(root, [webkitVariant]);
  assert.equal(manifest.sources[0].environment, "webkit");

  const wrappers = await writeVariantWrappers([webkitVariant], root);
  const wrapper = await fs.readFile(wrappers[0].wrapperPath, "utf8");
  assert.ok(wrapper.startsWith('"use webkit";'));

  const captureBanner = async (variant) => {
    let banner;
    const [wrapped] = await writeVariantWrappers([variant], root);
    await bundleSources([wrapped], root, {
      name: "capture",
      async bundle(_entry, _output, options) {
        banner = options.banner;
      },
    });
    return banner;
  };

  assert.equal(await captureBanner(webkitVariant), '"use webkit";');
  assert.equal(
    await captureBanner(makeVariant({ usesHttpClient: true })),
    '"use httpclient";',
  );
  assert.equal(await captureBanner(makeVariant({})), "");
});
