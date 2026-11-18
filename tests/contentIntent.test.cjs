const test = require("node:test");
const assert = require("node:assert/strict");
const { EmulatorApplication, resetEmulatorRuntime } = require("../dist/emulator");

test("sources read the content intent the test sets, defaulting to Safe Mode on", async () => {
  resetEmulatorRuntime();
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: true });

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

test("the emulator starts with Safe Mode on, like a fresh app", async () => {
  resetEmulatorRuntime({ Application: new EmulatorApplication() });
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: true });
  resetEmulatorRuntime({ Application: new EmulatorApplication({ isSafeModeEnabled: false }) });
  assert.deepEqual(await Application.getContentIntent(), { isSafeModeEnabled: false });
});
