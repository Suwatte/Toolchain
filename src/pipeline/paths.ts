import path from "path";
import { BuildCommandOptions, BuildPaths } from "./types";

const TEMP_DIR = "__temp__";
const OUT_DIR = "dist";

export const createBuildPaths = (
  config: BuildCommandOptions,
  basePath = process.cwd(),
): BuildPaths => {
  const outDir = path.join(basePath, config.folder ?? OUT_DIR);
  const tempDir = path.join(basePath, TEMP_DIR);
  return {
    basePath,
    sourceRootDir: path.join(basePath, "src", "sources"),
    tempDir,
    tempSourcesDir: path.join(tempDir, "sources"),
    tempWrappersDir: path.join(tempDir, "wrappers"),
    outDir,
    outSourcesDir: path.join(outDir, "sources"),
  };
};
