const test = require("node:test");
const assert = require("node:assert/strict");

const { formatBuildTimingReport } = require("../dist/utils/timingReport");

test("formatBuildTimingReport formats phase timings", () => {
  const report = formatBuildTimingReport({
    sourceCount: 92,
    variantCount: 105,
    timings: [
      { name: "typescript compile", durationMs: 1534.4 },
      { name: "source discovery", durationMs: 12.4 },
      { name: "total", durationMs: 1601.9 },
    ],
  });

  assert.match(report, /^Build timings \(92 sources, 105 variants\):/);
  assert.match(report, /typescript compile\s+1\.53s/);
  assert.match(report, /source discovery\s+12ms/);
  assert.match(report, /total\s+1\.60s/);
});
