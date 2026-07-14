#!/usr/bin/env node

import { Command } from "commander";
import { build } from "./commands/build";
import { serve } from "./commands/serve";
const json = require("../package.json");

const program = new Command();

program.name("suwatte").description("Suwatte Toolchain").version(json.version);

program
  .command("build")
  .alias("b")
  .description("Builds sources in project directory")
  .option("-f, --folder <folder>", "Change the output folder")
  .option("--timings", "Print build phase timing diagnostics")
  .action(build);

program
  .command("serve")
  .alias("s")
  .description("Builds & Serves a List on the local network")
  .option("-p, --port <string>", "Port server should run on.")
  .option("-f, --folder <folder>", "Change the output folder to serve")
  .option("--timings", "Print build phase timing diagnostics")
  .action(serve);

program.parse(process.argv);
