import path from "path";
import { BuildVariant } from "./types";
import { BundlerAdapter } from "./bundlers/BundlerAdapter";

const DEFAULT_BUNDLE_CONCURRENCY = 4;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const bundleVariant = async (
  variant: BuildVariant,
  outSourcesDir: string,
  bundler: BundlerAdapter,
) => {
  if (!variant.wrapperPath) {
    throw new Error(
      `Missing generated wrapper path for variant \"${variant.variantId}\"`,
    );
  }

  const outPath = path.join(outSourcesDir, `${variant.artifactId}.stt`);
  // The artifact head is plain directives, readable by both humans and the
  // app's SourceScriptStamp parser.
  const banner = [
    variant.environment === "webkit" ? `"use webkit";` : "",
    variant.usesHttpClient ? `"use httpclient";` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await bundler.bundle(variant.wrapperPath, outPath, { banner });
  } catch (error) {
    throw new Error(
      `Failed to bundle variant \"${variant.variantId}\" (${variant.sourceId}) using ${bundler.name}: ${getErrorMessage(
        error,
      )}`,
    );
  }
};

export const bundleSources = async (
  variants: BuildVariant[],
  outSourcesDir: string,
  bundler: BundlerAdapter,
) => {
  // Keep esbuild's service from retaining too many concurrent bundle graphs.
  for (let index = 0; index < variants.length; index += DEFAULT_BUNDLE_CONCURRENCY) {
    const batch = variants.slice(index, index + DEFAULT_BUNDLE_CONCURRENCY);
    await Promise.all(
      batch.map((variant) => bundleVariant(variant, outSourcesDir, bundler)),
    );
  }
};
