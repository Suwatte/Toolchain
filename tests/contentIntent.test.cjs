const test = require("node:test");
const assert = require("node:assert/strict");
const { EmulatorApplication, resetEmulatorRuntime } = require("../dist/emulator");

test("sources read the content intent the test sets, defaulting to Safe Mode off", async () => {
  resetEmulatorRuntime();
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: false });

  resetEmulatorRuntime({ Application: new EmulatorApplication({ isSafeModeEnabled: true }) });
  const intent = await Application.getContentIntent();
  assert.deepEqual(intent, { isSafeModeEnabled: true });

  // Only the one field reaches the source.
  resetEmulatorRuntime({ Application: new EmulatorApplication({ isSafeModeEnabled: true, hiddenCount: 3 }) });
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: true });

  // A source changing its copy can't change what the app reports next time.
  intent.isSafeModeEnabled = false;
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: true });
});
