import { BundlerAdapter } from "./BundlerAdapter";
import { EsbuildBundlerAdapter } from "./esbuildAdapter";

export const createBundlerAdapter = (): BundlerAdapter =>
  new EsbuildBundlerAdapter();
