import { build, stop } from "esbuild";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";
import { BundleOptions, BundlerAdapter } from "./BundlerAdapter";

// Device artifacts run in JavaScriptCore; the emulator and its transport
// (axios plus browser/node HTTP polyfills) must never end up in a bundle.
// Matching input paths keeps this deterministic — string scans of the output
// would false-positive on sources that legitimately mention these names.
const FORBIDDEN_INPUTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /[\\/]toolchain[\\/](src|dist)[\\/]emulator[\\/]/, label: "@suwatte/toolchain emulator" },
  { pattern: /[\\/]node_modules[\\/]axios[\\/]/, label: "axios" },
];

export class EsbuildBundlerAdapter implements BundlerAdapter {
  readonly name = "esbuild";

  async bundle(
    entryPath: string,
    outPath: string,
    options: BundleOptions = {},
  ): Promise<void> {
    const result = await build({
      entryPoints: [entryPath],
      outfile: outPath,
      bundle: true,
      format: "iife",
      globalName: "SourcePackage",
      platform: "browser",
      target: ["es2019"],
      sourcemap: false,
      minify: false,
      write: true,
      logLevel: "silent",
      metafile: true,
      define: {
        global: "globalThis",
        "process.env.NODE_ENV": "\"production\"",
      },
      banner: {
        js: [options.banner, "var global = globalThis;"]
          .filter(Boolean)
          .join("\n"),
      },
      plugins: [
        nodeModulesPolyfillPlugin({
          globals: {
            Buffer: true,
            process: true,
          },
        }),
      ],
    });

    const inputs = Object.keys(result.metafile?.inputs ?? {});
    for (const { pattern, label } of FORBIDDEN_INPUTS) {
      const offender = inputs.find((input) => pattern.test(input));
      if (offender) {
        throw new Error(
          `Bundle includes ${label} ("${offender}"), which cannot run in JavaScriptCore. ` +
            "Import runtime values from the package root or subpaths that do not reach the emulator.",
        );
      }
    }
  }

  async dispose(): Promise<void> {
    await stop();
  }
}
