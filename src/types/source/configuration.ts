/**
 * App capability flags such as `contentProgressProviding`, `librarySyncProviding`,
 * and `progressEventsProviding` are derived from delegate method presence.
 * Do not provide those flags in getConfiguration().
 */
export type SourceConfiguration = {
  imageReferer?: string;
  endpoint?: string[];
  /** Route source images through SourceObject.client (JSC/API v5 only). */
  useClientForImageRequests?: boolean;
};
