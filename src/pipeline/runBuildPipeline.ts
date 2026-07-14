import { compile } from "../utils/compile";
import { generateHTML } from "../utils/generateHTML";
import { createBundlerAdapter } from "./bundlers/createBundlerAdapter";
import { bundleSources } from "./bundleSources";
import {
  createCatalogManifest,
  resolveCatalogVariants,
  writeVariantWrappers,
} from "./catalog";
import { discoverSources } from "./discoverSources";
import {
  cleanupBuildDirectories,
  copyAssetsIfPresent,
  prepareBuildDirectories,
  writeCatalogManifest,
} from "./output";
import { createBuildPaths } from "./paths";
import {
  BuildCommandOptions,
  BuildPipelineResult,
  BuildTiming,
} from "./types";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const measure = async <T>(
  timings: BuildTiming[],
  name: string,
  work: () => Promise<T>,
): Promise<T> => {
  const start = now();
  try {
    return await work();
  } finally {
    timings.push({
      name,
      durationMs: now() - start,
    });
  }
};

const measureSync = <T>(
  timings: BuildTiming[],
  name: string,
  work: () => T,
): T => {
  const start = now();
  try {
    return work();
  } finally {
    timings.push({
      name,
      durationMs: now() - start,
    });
  }
};

export const runBuildPipeline = async (
  config: BuildCommandOptions,
): Promise<BuildPipelineResult> => {
  const timings: BuildTiming[] = [];
  const startedAt = now();
  let sourceCount = 0;
  let variantCount = 0;

  const paths = createBuildPaths(config);
  await measure(timings, "prepare directories", () =>
    prepareBuildDirectories(paths),
  );
  try {
    await measure(timings, "typescript compile", () => compile(paths.tempDir));
    const discoveredSources = await measure(timings, "source discovery", () =>
      discoverSources(paths.tempSourcesDir, paths.sourceRootDir),
    );
    sourceCount = discoveredSources.length;

    const variants = measureSync(timings, "variant resolution", () =>
      resolveCatalogVariants(discoveredSources),
    );
    variantCount = variants.length;
    const wrappedVariants = await measure(timings, "wrapper generation", () =>
      writeVariantWrappers(variants, paths.tempWrappersDir),
    );

    const bundler = createBundlerAdapter();
    try {
      await measure(timings, "source bundling", () =>
        bundleSources(wrappedVariants, paths.outSourcesDir, bundler),
      );
    } finally {
      await bundler.dispose?.();
    }

    const catalogManifest = measureSync(timings, "manifest generation", () =>
      createCatalogManifest(paths.basePath, wrappedVariants),
    );
    await measure(timings, "manifest write", () =>
      writeCatalogManifest(paths.outDir, catalogManifest),
    );
    await measure(timings, "asset copy", () =>
      copyAssetsIfPresent(paths.basePath, paths.outDir),
    );

    await measure(timings, "webpage generation", () =>
      generateHTML(paths.outDir),
    );
  } finally {
    await measure(timings, "temporary cleanup", () =>
      cleanupBuildDirectories(paths),
    );
  }

  timings.push({
    name: "total",
    durationMs: now() - startedAt,
  });

  return {
    sourceCount,
    variantCount,
    timings,
  };
};
