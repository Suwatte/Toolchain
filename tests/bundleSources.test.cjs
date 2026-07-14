const test = require("node:test");
const assert = require("node:assert/strict");

const { bundleSources } = require("../dist/pipeline/bundleSources");

test("bundleSources limits concurrent bundle work", async () => {
  let active = 0;
  let maxActive = 0;

  const bundler = {
    name: "test-bundler",
    async bundle() {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    },
  };

  const variants = Array.from({ length: 12 }, (_, index) => ({
    sourceId: `source-${index}`,
    variantId: `variant-${index}`,
    artifactId: `artifact-${index}`,
    entryPath: `source-${index}/index.js`,
    wrapperPath: `wrapper-${index}.js`,
    metadata: {
      id: `source-${index}`,
      name: `Source ${index}`,
      version: 1,
      website: "https://example.com",
      rating: 0,
      languages: ["en"],
    },
  }));

  await bundleSources(variants, "/tmp/suwatte-toolchain-test", bundler);

  assert.equal(maxActive, 4);
});
