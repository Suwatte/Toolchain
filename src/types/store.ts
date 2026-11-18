import { JsonObject } from "./utils";

/**
 * Methods that exist on the StoreHandler Class
 */
export declare class STTStore {
  /**
   * retrieves a value from the store
   * @param k The key of the KV Pair
   */
  get(k: string): Promise<unknown | null>;
  /**
   * sets a value to the store
   * @param k The Key of the Pair
   * @param v The Value of the pair
   */
  set(k: string, v: any): Promise<void>;
  remove(k: string): Promise<void>;

  // Helpers
  /**
   * @param k The key of the KV Pair
   * @returns null if the value is not stored but will throw an error if the corresponding value is not a string
   */
  string(k: string): Promise<string | null>;
  /**
   * @param k The key of the KV Pair
   * @returns null if the value is not stored but will throw an error if the corresponding value is not a boolean
   */
  boolean(k: string): Promise<boolean | null>;
  /**
   * @param k The key of the KV Pair
   * @returns null if the value is not stored but will throw an error if the corresponding value is not a number
   */
  number(k: string): Promise<number | null>;
  /**
   * @param k The key of the KV Pair
   * @returns null if the value is not stored but will throw an error if the corresponding value is not an array in which each element is a string
   */
  stringArray(k: string): Promise<string[] | null>;

  /**
   * @param k The key of the KV Pair
   * @returns null if the value is not stored but will throw an error if the corresponding value is not an array in which each element is a json object
   */
  object(k: string): Promise<JsonObject | null>;
}

/**
 * What the reader wants to see, for sources that can filter on their own server.
 * It carries only whether Safe Mode is on, never what the app hid or how much.
 */
export type ContentIntent = {
  /** Safe Mode is on, so the app hides mature and adult titles. */
  isSafeModeEnabled: boolean;
};

/**
 * Facts about the app a source may act on.
 *
 * Added in Suwatte 7.2.1 (build 12). On older apps `Application` doesn't
 * exist, so a source that supports them checks first:
 * `typeof Application !== "undefined"`, and treats Safe Mode as on otherwise.
 */
export declare class STTApplication {
  /**
   * What the reader wants to see right now. It can change between calls,
   * for example when a Safe Mode schedule starts, so ask per request.
   */
  getContentIntent(): Promise<ContentIntent>;
}
