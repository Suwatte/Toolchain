import fs from "fs";
import path from "path";
import typescript from "typescript";
import { DiscoveredSource, SourceEnvironment } from "./types";

const DIRECTIVE_SCAN_BYTES = 512;
const JSC_ONLY_GLOBALS = new Set([
  "HttpClient",
  "NativeImage",
  "NativeCanvas",
  "Crypto",
]);

const directiveHead = (source: Buffer | string): string => {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source);
  return bytes.subarray(0, DIRECTIVE_SCAN_BYTES).toString("utf8");
};

const hasDirective = (source: Buffer | string, name: string): boolean => {
  const head = directiveHead(source);
  return head.includes(`"${name}"`) || head.includes(`'${name}'`);
};

export const detectSourceEnvironment = (source: Buffer | string): SourceEnvironment =>
  hasDirective(source, "use webkit") ? "webkit" : "jsc";

export const detectHttpClientDirective = (source: Buffer | string): boolean =>
  hasDirective(source, "use httpclient");

const findSourceEntry = async (sourceDir: string, compiledEntry: string) => {
  for (const fileName of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
    const candidate = path.join(sourceDir, fileName);
    try {
      await fs.promises.access(candidate, fs.constants.F_OK);
      return candidate;
    } catch {
      // Try the next supported source entry extension.
    }
  }
  return compiledEntry;
};

const sourceFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(entryPath)));
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    files.push(entryPath);
  }

  return files;
};

const findGlobalReferences = async (
  sourceDir: string,
  globals: ReadonlySet<string>,
): Promise<string[]> => {
  const found = new Set<string>();
  for (const filePath of await sourceFiles(sourceDir)) {
    const content = await fs.promises.readFile(filePath, "utf8");
    const sourceFile = typescript.createSourceFile(
      filePath,
      content,
      typescript.ScriptTarget.Latest,
      true,
    );
    const visit = (node: typescript.Node) => {
      if (typescript.isIdentifier(node) && globals.has(node.text)) {
        found.add(node.text);
      }
      typescript.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return [...found].sort();
};

export const findUnsupportedWebKitAPIs = (sourceDir: string): Promise<string[]> =>
  findGlobalReferences(sourceDir, JSC_ONLY_GLOBALS);

const detectHttpClientUsage = async (sourceDir: string): Promise<boolean> => {
  const references = await findGlobalReferences(sourceDir, new Set(["HttpClient"]));
  return references.length > 0;
};

export const discoverSources = async (
  compiledSourcesDir: string,
  sourceRootDir: string,
): Promise<DiscoveredSource[]> => {
  const entries = await fs.promises.readdir(compiledSourcesDir, {
    withFileTypes: true,
  });

  const discovered = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const id = entry.name;
        const sourceDir = path.join(sourceRootDir, id);
        const entryPath = path.join(compiledSourcesDir, id, "index.js");

        const hasEntry = await fs.promises
          .access(entryPath, fs.constants.F_OK)
          .then(
            () => true,
            () => false,
          );

        if (!hasEntry) {
          return null;
        }

        const sourceEntry = await findSourceEntry(sourceDir, entryPath);
        const entryContent = await fs.promises.readFile(sourceEntry);
        const environment = detectSourceEnvironment(entryContent);
        if (environment === "webkit") {
          const unsupported = await findUnsupportedWebKitAPIs(sourceDir);
          if (unsupported.length > 0) {
            throw new Error(
              `Source "${id}" uses JSC-only APIs in a WebKit build: ${unsupported.join(
                ", ",
              )}`,
            );
          }
        }

        // HttpClient is opt-in. Preserve an explicit directive or infer it
        // from usage, then stamp the artifact so the app can select the
        // transport without executing Source code.
        const usesHttpClient =
          environment === "jsc" &&
          (detectHttpClientDirective(entryContent) ||
            (await detectHttpClientUsage(sourceDir)));

        return {
          id,
          sourceDir,
          entryPath,
          environment,
          usesHttpClient,
        } satisfies DiscoveredSource;
      }),
  );

  return discovered
    .filter((value): value is DiscoveredSource => value !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
};
