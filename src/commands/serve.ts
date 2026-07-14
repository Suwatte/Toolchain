import chalk from "chalk";
import * as http from "http";
import handler from "serve-handler";
import { handleLogRequest } from "../utils/handleLog";
import { getLocalNetworkAddress } from "../utils/localNetwork";
import path from "path";
import { runBuildPipeline } from "../pipeline/runBuildPipeline";
import { BuildCommandOptions } from "../pipeline/types";
import { formatBuildTimingReport } from "../utils/timingReport";

type ServeOptions = BuildCommandOptions & {
  port?: string;
};

const DEFAULT_PORT = 8080;

const parsePort = (value?: string): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid port "${value}"`);
  }

  return parsed;
};

const createCatalogServer = (publicPath: string) =>
  http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/log") {
      return handleLogRequest(req, res);
    }

    return handler(req, res, {
      cleanUrls: true,
      public: publicPath,
      directoryListing: false,
      unlisted: [".*"],
    });
  });

const buildCatalog = async (options: ServeOptions, reason: string) => {
  console.info(
    chalk.yellow.bold(`Building Catalog${reason ? ` (${reason})` : ""}...`)
  );
  try {
    const result = await runBuildPipeline({
      folder: options.folder,
      timings: options.timings,
    });
    console.info(chalk.green.bold("Catalog Compiled Successfully!"));
    if (options.timings) {
      console.info(formatBuildTimingReport(result));
    }
  } catch (err: any) {
    console.error(chalk.red.bold("Failed to build source catalog"));
    console.error(chalk.red.bold(`${err.message}`));
  }
};

export const serve = async (options: ServeOptions) => {
  await buildCatalog(options, "initial");

  const port = parsePort(options.port);
  const publicPath = path.join(process.cwd(), options.folder ?? "dist");
  const server = createCatalogServer(publicPath);

  server.on("error", (error) => {
    console.error(chalk.red.bold("Failed to start server"));
    console.error(chalk.red.bold(`${error.message}`));
    process.exit(1);
  });

  server.listen(port, () => {
    console.info(
      chalk.green.bold(`Server Running @ http://127.0.0.1:${port}/`)
    );
    const localAddress = getLocalNetworkAddress();
    if (localAddress) {
      console.info(
        chalk.green.bold(
          `Accessible on local network @ http://${localAddress}:${port}/`
        )
      );
    }

    console.info(
      chalk.green.bold(
        `Log Address @ http://127.0.0.1:${port}/log${
          localAddress ? ` & http://${localAddress}:${port}/log` : ""
        }`
      )
    );
    console.info(chalk.blue.bold("Hit CTRL-C to stop the server"));
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};
