import fs from "fs";
import path from "path";
import { BuildPaths, CatalogManifest } from "./types";

export const prepareBuildDirectories = async (paths: BuildPaths) => {
  await fs.promises.rm(paths.tempDir, { recursive: true, force: true });
  await fs.promises.mkdir(paths.tempDir, { recursive: true });
  await fs.promises.mkdir(paths.tempWrappersDir, { recursive: true });

  await fs.promises.rm(paths.outDir, { recursive: true, force: true });
  await fs.promises.mkdir(paths.outDir, { recursive: true });
  await fs.promises.mkdir(paths.outSourcesDir, { recursive: true });
};

export const cleanupBuildDirectories = async (paths: BuildPaths) => {
  await fs.promises.rm(paths.tempDir, { recursive: true, force: true });
};

export const writeCatalogManifest = async (
  outDir: string,
  manifest: CatalogManifest,
) => {
  const outPath = path.join(outDir, "sources.json");
  await fs.promises.writeFile(outPath, JSON.stringify(manifest));
};

export const copyAssetsIfPresent = async (basePath: string, outDir: string) => {
  const assetsDirectory = path.join(basePath, "assets");
  if (!fs.existsSync(assetsDirectory)) {
    return;
  }
  const destination = path.join(outDir, "assets");
  await fs.promises.cp(assetsDirectory, destination, {
    force: true,
    recursive: true,
  });
};
