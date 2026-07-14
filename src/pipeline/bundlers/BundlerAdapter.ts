export type BundleOptions = {
  banner?: string;
};

export interface BundlerAdapter {
  readonly name: string;
  bundle(
    entryPath: string,
    outPath: string,
    options?: BundleOptions,
  ): Promise<void>;
  dispose?(): Promise<void>;
}
