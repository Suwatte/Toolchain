import type { SourceInfo } from "../types/source/source";
import type { SourceClass, SourceVariant } from "../types";

/**
 * Extract the default export from a module, handling CJS/ESM interop.
 * Validates that the export is a class with a static `info` property.
 */
export const resolveDefaultExport = (sourceModule: unknown): SourceClass => {
  const value = sourceModule as { default?: unknown } | unknown;
  const resolved =
    typeof value === "object" && value !== null && "default" in value
      ? (value as { default: unknown }).default
      : value;

  if (typeof resolved !== "function" || !("info" in resolved)) {
    throw new Error(
      "Default export must be a class with a static 'info' property",
    );
  }

  return resolved as SourceClass;
};

/** @deprecated Use resolveDefaultExport */
export const normalizeSourceEntry = resolveDefaultExport;

/**
 * Read the static SourceInfo from a source class.
 */
export const readSourceInfo = (cls: SourceClass): SourceInfo => {
  const info = cls.info;
  if (!info || typeof info !== "object" || !info.id) {
    throw new Error(
      "Source class must have a static 'info' property with at least an 'id'",
    );
  }
  return info;
};

/**
 * Read static variants from a source class, if any.
 * Returns a single-element array derived from info if none defined.
 */
export const readSourceVariants = (cls: SourceClass): SourceVariant[] => {
  const variants = cls.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    return variants;
  }
  return [
    {
      id: cls.info.id,
      name: cls.info.name,
      languages: cls.info.languages,
    },
  ];
};

/**
 * Build metadata for a specific variant by overlaying variant fields onto info.
 */
export const buildVariantMetadata = (
  info: SourceInfo,
  variant: SourceVariant,
): SourceInfo => ({
  ...info,
  id: variant.id ?? info.id,
  name: variant.name ?? info.name,
  languages: variant.languages ?? info.languages,
});

/**
 * Instantiate a source class, optionally with variant args.
 */
export const instantiateSource = (
  cls: SourceClass,
  variant?: SourceVariant,
) => {
  return new cls(variant?.args);
};
