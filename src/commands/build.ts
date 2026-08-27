import chalk from "chalk";
import { runBuildPipeline } from "../pipeline/runBuildPipeline";
import { BuildCommandOptions } from "../pipeline/types";
import { formatBuildTimingReport } from "../utils/timingReport";

export const build = async (config: BuildCommandOptions) => {
  console.info(chalk.yellow.bold("Building catalog..."));
  try {
    const result = await runBuildPipeline(config);
    console.info(chalk.green.bold("Catalog compiled successfully."));
    if (config.timings) {
      console.info(formatBuildTimingReport(result));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build source catalog: ${message}`, {
      cause: error,
    });
  }
};
