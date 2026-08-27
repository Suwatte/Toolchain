const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const typescript = require("typescript");

test("public declarations typecheck in a strict DOM consumer", () => {
  const fixture = path.join(__dirname, "fixtures", "publicTypes.ts");
  const program = typescript.createProgram([fixture], {
    module: typescript.ModuleKind.Node16,
    moduleResolution: typescript.ModuleResolutionKind.Node16,
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: typescript.ScriptTarget.ES2022,
  });
  const diagnostics = typescript.getPreEmitDiagnostics(program);

  assert.deepEqual(
    diagnostics.map((diagnostic) =>
      typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    ),
    [],
  );
});
