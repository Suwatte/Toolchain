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
  /**
   * Selects one source-wide chapter path. Missing values remain legacy image
   * pages. Publication is enabled only with chapterContentVersion 1 and a
   * getChapterContent delegate method.
   */
  chapterPresentation?: SourceChapterPresentation;
  /** Exact publication wire-contract version. The current supported value is 1. */
  chapterContentVersion?: number;
};

export enum SourceChapterPresentation {
  IMAGE_PAGES = "imagePages",
  PUBLICATION = "publication",
}
