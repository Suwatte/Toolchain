export type BuildCommandOptions = {
  folder?: string;
  timings?: boolean;
};

export type BuildTiming = {
  name: string;
  durationMs: number;
};

export type BuildPipelineResult = {
  sourceCount: number;
  variantCount: number;
  timings: BuildTiming[];
};

export type BuildPaths = {
  basePath: string;
  sourceRootDir: string;
  tempDir: string;
  tempSourcesDir: string;
  tempWrappersDir: string;
  outDir: string;
  outSourcesDir: string;
};

export const CATALOG_VERSION = 2;

export type SourceEnvironment = "jsc" | "webkit";

export type DiscoveredSource = {
  id: string;
  sourceDir: string;
  entryPath: string;
  environment: SourceEnvironment;
  usesHttpClient: boolean;
};

/**
 * Features a source offers, shown as badges in the app's source catalog.
 * Each is read from the source's own methods, so a source can't claim one it lacks.
 */
export type CatalogCapability =
  | "signIn"
  | "librarySync"
  | "progressSync"
  | "novels";

export type BuildVariant = {
  sourceId: string;
  variantId: string;
  artifactId: string;
  entryPath: string;
  environment: SourceEnvironment;
  usesHttpClient: boolean;
  metadata: {
    id: string;
    name: string;
    version: number;
    website: string;
    rating: number;
    thumbnail?: string;
    minSupportedAppVersion?: string;
    languages: string[];
  };
  variantArgs?: Record<string, unknown>;
  config?: unknown;
  capabilities?: CatalogCapability[];
  wrapperPath?: string;
};

export type CatalogSource = {
  id: string;
  name: string;
  version: number;
  website: string;
  rating: number;
  thumbnail?: string;
  minSupportedAppVersion?: string;
  languages: string[];
  path: string;
  config?: unknown;
  variantId: string;
  sourceId: string;
  environment: SourceEnvironment;
  /** Left out when the source offers none. */
  capabilities?: CatalogCapability[];
};

export type CatalogManifest = {
  catalogVersion: typeof CATALOG_VERSION;
  generatedAt: string;
  listName: string | null;
  sources: CatalogSource[];
};
