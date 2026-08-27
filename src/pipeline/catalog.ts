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
