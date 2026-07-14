import chalk from "chalk";
import { runBuildPipeline } from "../pipeline/runBuildPipeline";
import { BuildCommandOptions } from "../pipeline/types";
import { formatBuildTimingReport } from "../utils/timingReport";

export const build = async (config: BuildCommandOptions) => {
  console.info(chalk.yellow.bold("Building Catalog..."));
  try {
    const result = await runBuildPipeline(config);
    console.info(
      chalk.green.bold("Catalog Compiled Successfully!")
    );
    if (config.timings) {
      console.info(formatBuildTimingReport(result));
    }
  } catch (err: any) {
    console.error(chalk.red.bold("Failed to build source catalog"));
    console.error(chalk.red.bold(`${err.message}`));
    process.exit(-1);
  }
};
