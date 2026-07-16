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
