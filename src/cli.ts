#!/usr/bin/env node

import { Command } from "commander";
import { build } from "./commands/build";
import { serve } from "./commands/serve";

const json = require("../package.json");

const program = new Command();

program
  .name("suwatte")
  .description("Build and test Suwatte Source plugin catalogs")
  .version(json.version);

program
  .command("build")
  .alias("b")
  .description("Build the source catalog in the current project")
  .option("-f, --folder <folder>", "Set the output folder")
  .option("--timings", "Print build phase timing diagnostics")
  .action(build);

program
  .command("serve")
  .alias("s")
  .description("Build and serve the source catalog on the local network")
  .option("-p, --port <port>", "Set the server port")
  .option("-f, --folder <folder>", "Set the output folder")
  .option("--timings", "Print build phase timing diagnostics")
  .action(serve);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
