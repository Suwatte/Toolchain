import fs from "fs";
import path from "path";
import { installEmulatorGlobals } from "../emulator/classes";
import {
  buildVariantMetadata,
  readSourceInfo,
  readSourceVariants,
  resolveDefaultExport,
} from "../runtime";
import { ContentRating } from "../types";
import {
  BuildVariant,
  CATALOG_VERSION,
  CatalogCapability,
  CatalogManifest,
  CatalogSource,
  DiscoveredSource,
} from "./types";

const sanitizeArtifactId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const readListName = (basePath: string): string | null => {
  const packagePath = path.join(basePath, "package.json");
  if (!fs.existsSync(packagePath)) {
    return null;
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    name?: string;
    suwatte?: {
      listName?: string;
    };
  };

  return pkg.suwatte?.listName ?? pkg.name ?? null;
};

const loadSourceClass = (entryPath: string) => {
  const resolvedPath = require.resolve(entryPath);
  delete require.cache[resolvedPath];
  const moduleValue = require(resolvedPath) as unknown;
  return resolveDefaultExport(moduleValue);
};

/** The methods behind each catalog badge; any one of them is enough. */
const CAPABILITY_METHODS: [CatalogCapability, string[]][] = [
  ["signIn", ["handleOAuthCallback", "clearAuthentication"]],
  ["librarySync", ["synchronizeLibrary"]],
  ["progressSync", ["getTrackEntryPage"]],
  ["novels", ["getChapterText"]],
];

/**
 * Reads the badges from the source's methods. Methods written as class fields
 * only exist on an instance, so one is made if the prototype lacks any.
 */
export const readCatalogCapabilities = (
  cls: new (...args: any[]) => unknown,
  args?: Record<string, unknown>,
): CatalogCapability[] => {
  const prototype = cls.prototype as Record<string, unknown> | undefined;
  let instance: Record<string, unknown> | undefined;
  const has = (name: string) => {
    if (typeof prototype?.[name] === "function") return true;
    if (instance === undefined) {
      try {
        instance = new cls(args) as Record<string, unknown>;
      } catch {
        instance = {};
      }
    }
    return typeof instance?.[name] === "function";
  };
  return CAPABILITY_METHODS.filter(([, methods]) => methods.some(has)).map(
    ([capability]) => capability,
  );
};

export const resolveCatalogVariants = (
  discoveredSources: DiscoveredSource[],
): BuildVariant[] => {
  // Source classes can access native globals while their static metadata loads.
  installEmulatorGlobals();

  return discoveredSources.flatMap((source) => {
    const cls = loadSourceClass(source.entryPath);
    const info = readSourceInfo(cls);
    const variants = readSourceVariants(cls);
    const multipleVariants = variants.length > 1;

    const isValidRating =
      Number.isInteger(info.rating) &&
      Number(info.rating) >= ContentRating.EVERYONE &&
      Number(info.rating) <= ContentRating.UNKNOWN;

    if (!isValidRating) {
      throw new Error(
        `Source "${source.id}" must provide a valid numeric rating (${ContentRating.EVERYONE}-${ContentRating.UNKNOWN})`,
      );
    }

    const variantIds = new Set<string>();
    return variants.map((variant, index) => {
      if (variantIds.has(variant.id)) {
        throw new Error(
          `Source "${source.id}" has duplicate variant id "${variant.id}"`,
        );
      }
      variantIds.add(variant.id);

      const metadata = buildVariantMetadata(info, variant);
      const artifactId = multipleVariants
        ? `${source.id}--${sanitizeArtifactId(variant.id || String(index))}`
        : source.id;

      return {
        sourceId: source.id,
        variantId: variant.id,
        artifactId,
        entryPath: source.entryPath,
        environment: source.environment,
        usesHttpClient: source.usesHttpClient,
        metadata: {
          ...metadata,
          rating: metadata.rating as number,
        },
        variantArgs: variant.args,
        config: variant.config,
        capabilities: readCatalogCapabilities(cls, variant.args),
      } satisfies BuildVariant;
    });
  });
};

export const createCatalogManifest = (
  basePath: string,
  variants: BuildVariant[],
): CatalogManifest => {
  const sources: CatalogSource[] = variants
    .map((variant) => ({
      ...variant.metadata,
      path: variant.artifactId,
      config: variant.config,
      variantId: variant.variantId,
      sourceId: variant.sourceId,
      environment: variant.environment,
      ...(variant.capabilities?.length
        ? { capabilities: variant.capabilities }
        : {}),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    catalogVersion: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    listName: readListName(basePath),
    sources,
  };
};

const buildVariantBootstrapSource = (variant: BuildVariant) => {
  const runtimeModulePath = require.resolve("@suwatte/toolchain/runtime");
  const metadataJson = JSON.stringify(variant.metadata);
  const configJson = JSON.stringify(variant.config ?? null);
  const argsJson = JSON.stringify(variant.variantArgs ?? null);

  return [
    variant.environment === "webkit" ? `"use webkit";` : "",
    `"use strict";`,
    `var runtime = require(${JSON.stringify(runtimeModulePath)});`,
    `var sourceModule = require(${JSON.stringify(variant.entryPath)});`,
    `var cls = runtime.resolveDefaultExport(sourceModule);`,
    `exports.SourceMetadata = ${metadataJson};`,
    `exports.SourceConfiguration = ${configJson};`,
    `exports.bootstrap = function bootstrap() {`,
    `  var args = ${argsJson};`,
    `  return runtime.instantiateSource(cls, args ? { args: args } : undefined);`,
    `};`,
    ``,
  ].join("\n");
};

export const writeVariantWrappers = async (
  variants: BuildVariant[],
  tempWrappersDir: string,
): Promise<BuildVariant[]> => {
  await fs.promises.mkdir(tempWrappersDir, { recursive: true });

  return Promise.all(
    variants.map(async (variant) => {
      const wrapperPath = path.join(
        tempWrappersDir,
        `${variant.artifactId}.js`,
      );
      const content = buildVariantBootstrapSource(variant);
      await fs.promises.writeFile(wrapperPath, content);
      return {
        ...variant,
        wrapperPath,
      };
    }),
  );
};
