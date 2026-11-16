import { NetworkRequest } from "../networking";
import { JsonObject } from "../utils";
import { ReadingMode } from "./content";

export type SourceChapterData = JsonObject;

/**
 * This represents a source-agnostic way to identify a chapter, using just it's volume and chapter number
 *
 */
export type ChapterItem = {
  /**
   * Non-negative chapter number.
   */
  number: number;
  volume?: number;
};

/**
 * This represents a single chapter of a title
 */
export type Chapter = {
  id: string;
  index: number;

  /**
   * -1 for unknown chapter number, otherwise non-negative.
   */
  number: number;
  volume?: number;

  language?: string;
  title?: string;
  date?: Date;
  webUrl?: string;
  coverImage?: string;
  isSpecial?: boolean;

  data?: SourceChapterData;
  providers?: ChapterProvider[];
  isLocked?: boolean;

  /**
   * Files the reader can download for this chapter.
   *
   * A download-first Source (one without `getChapterPages`, or without
   * `getChapterText` for novels) is read from these files: opening a chapter
   * downloads its file, in any format, then opens it in the matching reader.
   *
   * In a Source that streams pages, a CBZ or CBR file replaces the page
   * download when the chapter is downloaded; reading online still streams
   * pages, and other formats are left for the Files list.
   */
  acquisitions?: Acquisition[];
};

export enum AcquisitionFormat {
  CBZ = "cbz",
  CBR = "cbr",
  EPUB = "epub",
  PDF = "pdf",
}

/**
 * The request for a file. Header values are strings because the app sends
 * them exactly as given.
 */
export type AcquisitionRequest = Omit<NetworkRequest, "headers"> & {
  headers?: Record<string, string>;
};

type AcquisitionDetails = {
  /** Unique within its list. Passed to `resolveAcquisition`. */
  id: string;
  format: AcquisitionFormat;
  /** Shown in the Files list, such as "Volume 3" or "Digital (HQ)". */
  title?: string;
  /** Expected size, shown before downloading. */
  byteCount?: number;
  /** Suggested file name, including its extension. */
  fileName?: string;
};

/**
 * A downloadable file for a chapter (`Chapter.acquisitions`) or a whole title,
 * such as a volume or omnibus (`Content.acquisitions`).
 *
 * The app downloads it through this Source's network client, with the same
 * cookies, user agent and Cloudflare handling as page requests.
 *
 * Give it either a `request` that stays valid, or `resolveBeforeDownload: true`
 * when links are signed or short-lived. The app then calls
 * `resolveAcquisition` for a fresh request before each download and never
 * stores it.
 */
export type Acquisition = AcquisitionDetails &
  (
    | { request: AcquisitionRequest; resolveBeforeDownload?: false }
    | { request?: never; resolveBeforeDownload: true }
  );

/** Identifies the file `resolveAcquisition` should return a request for. */
export type AcquisitionTarget = {
  contentId: string;
  acquisitionId: string;
  /** Set for chapter files, omitted for title files. */
  chapterId?: string;
};

/**
 * This represents a singular page within a chapter
 */
export type ChapterPage = {
  url?: string;
  /** Opaque data returned to HttpClient image interceptors for this page. */
  context?: JsonObject;
  b64?: string;
  raw?: ArrayBuffer;
};

export enum SourceChapterTextFormat {
  HTML = "html",
  PLAIN_TEXT = "plainText",
}

/** Wire limits shared with Suwatte's chapter-text decoder. Values are UTF-8 bytes. */
export const SOURCE_CHAPTER_TEXT_LIMITS = Object.freeze({
  bridgePayload: 4 * 1024 * 1024,
  body: 2 * 1024 * 1024,
  resources: 512,
  resourceHref: 2048,
  resourceURL: 8192,
  resourceMediaType: 256,
});

/** Transient request metadata for one resource referenced by chapter content. */
export type SourceChapterResource = {
  /** Strict canonical publication-relative path, such as images/hero.jpg. */
  href: string;
  /** Host-bearing HTTP(S) URL without embedded credentials. */
  url: string;
  mediaType?: string;
  /** Opaque data forwarded through the source-owned request path. */
  context?: JsonObject;
};

/** Semantic text returned by getChapterText(contentId, chapterId). */
export type SourceChapterText = {
  format: SourceChapterTextFormat;
  body: string;
  resources?: SourceChapterResource[];
};

/** Stable source error for a chapter that cannot currently be obtained. */
export class ChapterUnavailableError extends Error {
  constructor(message: string = "Chapter content is unavailable.") {
    super(message);
    this.name = "ChapterUnavailable";
  }
}

/** Stable source error for chapter content that requires authorization/access. */
export class ChapterLockedError extends Error {
  constructor(message: string = "Chapter content is locked.") {
    super(message);
    this.name = "ChapterLocked";
  }
}

/**
 * This represents a translator, owner etc of an available chapter
 */
export type ChapterProvider = {
  id: string;
  name: string;
  links: ChapterProviderLink[];
};

/**
 * this represents a link to view the provider on. can be their website, discord, patreon etc
 */
export type ChapterProviderLink = {
  title: string;
  url: string;
};

export interface ChapterRequest {
  contentId: string;
  chapterId: string;

  readingMode?: ReadingMode;
  pageNumber?: number;
  context?: JsonObject;
}
