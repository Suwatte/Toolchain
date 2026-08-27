import path from "path";
import typescript from "typescript";

const formatDiagnostics = (diagnostics: readonly typescript.Diagnostic[]) =>
  typescript.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });

const getParsedCommandLine = (
  tsConfigPath: string,
  outDir: string
): typescript.ParsedCommandLine => {
  const configHost: typescript.ParseConfigFileHost = {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(formatDiagnostics([diagnostic]));
    },
  };

  const parsed = typescript.getParsedCommandLineOfConfigFile(
    tsConfigPath,
    { outDir },
    configHost
  );

  if (!parsed) {
    throw new Error(`Unable to parse TypeScript config at ${tsConfigPath}`);
  }

  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors));
  }

  return parsed;
};

export async function compile(outDir: string) {
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
  const parsed = getParsedCommandLine(tsConfigPath, outDir);

  const builder = typescript.createIncrementalProgram({
    rootNames: parsed.fileNames,
    options: {
      ...parsed.options,
      outDir,
      // Override to Node16: supports package exports maps AND emits CJS
      // (when the project has no "type": "module" in package.json)
      module: typescript.ModuleKind.Node16,
      moduleResolution: typescript.ModuleResolutionKind.Node16,
    },
    projectReferences: parsed.projectReferences,
  });

  const emitResult = builder.emit();
  const allDiagnostics = typescript
    .getPreEmitDiagnostics(builder.getProgram())
    .concat(emitResult.diagnostics);

  const errors = allDiagnostics.filter(
    (diagnostic) =>
      diagnostic.category === typescript.DiagnosticCategory.Error
  );

  if (errors.length > 0) {
    throw new Error(formatDiagnostics(errors));
  }
}
