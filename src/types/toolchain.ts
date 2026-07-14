import type { SourceConfiguration } from "./source/configuration";
import type { Delegate } from "./source/delegate";
import type { SourceInfo } from "./source/source";

export type SourceVariant = {
  id: string;
  name?: string;
  languages?: string[];
  config?: SourceConfiguration;
  args?: Record<string, unknown>;
};

export type SourceClass = {
  new (args?: Record<string, unknown>): Delegate;
  readonly info: SourceInfo;
  readonly variants?: SourceVariant[];
};

export type SourceEntry = SourceClass;
