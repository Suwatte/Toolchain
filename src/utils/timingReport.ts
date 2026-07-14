import { BuildPipelineResult } from "../pipeline/types";

const formatDuration = (durationMs: number): string => {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }

  return `${Math.round(durationMs)}ms`;
};

export const formatBuildTimingReport = (
  result: BuildPipelineResult,
): string => {
  const nameWidth = result.timings.reduce(
    (width, timing) => Math.max(width, timing.name.length),
    0,
  );
  const lines = [
    `Build timings (${result.sourceCount} sources, ${result.variantCount} variants):`,
  ];

  for (const timing of result.timings) {
    lines.push(
      `  ${timing.name.padEnd(nameWidth)}  ${formatDuration(
        timing.durationMs,
      )}`,
    );
  }

  return lines.join("\n");
};
