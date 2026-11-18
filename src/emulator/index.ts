import {
  instantiateSource,
  readSourceVariants,
  resolveDefaultExport,
} from "../runtime";
import {
  CloudflareError,
  EmulatorApplication,
  HttpClient,
  HttpError,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  installEmulatorGlobals,
  type EmulatorGlobalOverrides,
  NetworkClient,
  NetworkError,
  resetEmulatorRuntime,
  resetEmulatorStores,
  STTStore,
} from "./classes";
import { Crypto, NativeCanvas, NativeImage } from "./native";

export type EmulateSourceOptions = {
  variantId?: string;
  initializeGlobals?: boolean;
  resetStores?: boolean;
  globals?: EmulatorGlobalOverrides;
};

/**
 * Install emulator globals (NetworkClient, stores, etc.) for testing.
 * Call this before instantiating source classes in tests.
 */
export const setupTestGlobals = (
  overrides?: EmulatorGlobalOverrides,
): void => {
  installEmulatorGlobals(overrides);
};

/**
 * Emulate a source module: install globals, resolve the class, instantiate it.
 */
export function emulateSourceEntry<T>(
  sourceModuleOrEntry: { default?: unknown } | (new (...args: any[]) => T) | unknown,
  options: EmulateSourceOptions = {},
): T {
  const {
    variantId,
    initializeGlobals = true,
    resetStores = false,
    globals,
  } = options;

  if (initializeGlobals) {
    if (resetStores) {
      resetEmulatorRuntime(globals);
    } else {
      installEmulatorGlobals(globals);
    }
  } else {
    if (resetStores) {
      resetEmulatorStores();
    }
    if (globals) {
      installEmulatorGlobals(globals);
    }
  }

  const cls = resolveDefaultExport(sourceModuleOrEntry as unknown);

  if (variantId) {
    const variants = readSourceVariants(cls);
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error(`Variant "${variantId}" not found`);
    }
    return instantiateSource(cls, variant) as T;
  }

  return instantiateSource(cls) as T;
}

function emulate<T>(
  sourceModuleOrEntry: { default?: unknown } | (new (...args: any[]) => T) | unknown,
  options: EmulateSourceOptions = {},
): T {
  return emulateSourceEntry<T>(sourceModuleOrEntry, options);
}

export {
  CloudflareError,
  EmulatorApplication,
  HttpClient,
  HttpError,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  installEmulatorGlobals,
  NetworkClient,
  NetworkError,
  NativeImage,
  NativeCanvas,
  Crypto,
  resetEmulatorRuntime,
  resetEmulatorStores,
  STTStore,
};

export default emulate;
