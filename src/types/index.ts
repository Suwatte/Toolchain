import { NetworkRequest, NetworkResponse } from "./networking";
import { STTApplication, STTStore } from "./store";
export * from "./networking";
export * from "./native";
export * from "./source";
export * from "./store";
export * from "./utils";
export * from "./toolchain";

/**
 * Globally Available Stores.
 */
declare global {
  /**
   * Stores Key-Value pairs as a JSON String in the UserDefault
   */
  const ObjectStore: STTStore;
  /**
   * Facts about the app, such as whether Safe Mode is on.
   */
  const Application: STTApplication;
}

declare global {
  class NetworkError extends Error {
    req: NetworkRequest;
    res: NetworkResponse;
    constructor(
      name: string,
      message: string,
      req: NetworkRequest,
      res: NetworkResponse,
    );
  }

  class CloudflareError extends Error {
    constructor(resolutionURL?: string);
    resolutionURL?: string;
  }
}
