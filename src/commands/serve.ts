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
    chalk.yellow.bold(`Building catalog${reason ? ` (${reason})` : ""}...`),
  );
  const result = await runBuildPipeline({
    folder: options.folder,
    timings: options.timings,
  });
  console.info(chalk.green.bold("Catalog compiled successfully."));
  if (options.timings) {
    console.info(formatBuildTimingReport(result));
  }
};

export const serve = async (options: ServeOptions) => {
  try {
    await buildCatalog(options, "initial");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build source catalog: ${message}`, {
      cause: error,
    });
  }

  const port = parsePort(options.port);
  const publicPath = path.join(process.cwd(), options.folder ?? "dist");
  const server = createCatalogServer(publicPath);

  server.on("error", (error) => {
    console.error(chalk.red.bold(`Failed to start server: ${error.message}`));
    process.exitCode = 1;
  });

  server.listen(port, () => {
    console.info(
      chalk.green.bold(`Server running at http://127.0.0.1:${port}/`),
    );
    const localAddress = getLocalNetworkAddress();
    if (localAddress) {
      console.info(
        chalk.green.bold(
          `Available on the local network at http://${localAddress}:${port}/`,
        ),
      );
    }

    console.info(
      chalk.green.bold(
        `Log endpoint: http://127.0.0.1:${port}/log${
          localAddress ? ` & http://${localAddress}:${port}/log` : ""
        }`,
      ),
    );
    console.info(chalk.blue.bold("Press Ctrl+C to stop the server."));
  });

  const shutdown = () => {
    server.close();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};
