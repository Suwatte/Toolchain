import { UISection } from "./form";
import { JsonObject } from "../utils";
import { Destination } from "./destination";
import { Chapter } from "./chapter";
import { ItemCollection } from "./item";
import { Tag, TagSection } from "./tag";

export type Content = {
  title: string;
  coverImage: string;
  bannerImage?: string;
  artworks?: string[];
  webUrl?: string;

  rating: ContentRating;
  status?: ContentStatus;
  /** NOVEL routes exclusively to getChapterText; all other values use pages. */
  contentType?: ContentType;
  readingMode?: ReadingMode;

  // Other Semi important information about this title
  statistics?: Statistics;
  credits?: Credit[];
  summary?: string;
  additionalTitles?: string[];
  additionalDetails?: Record<string, string>;

  // Other Displayed Sections
  genres?: Tag[];
  properties?: TagSection[];
  collections?: ItemCollection[];
  links?: WebLink[];
  characters?: Character[];

  // Tracking
  /// Key, Value pairs used to automatically link to other sources
  endpoints?: Record<string, string>;
  trackStatus?: TrackStatus;

  // Source Context
  context?: JsonObject;

  // Attached Chapters
  chapters?: Chapter[];
};

export type Statistics = {
  rating?: number;
  favorites?: number;
  bookmarks?: number;
  views?: number;
};

export type Character = {
  name: string;
  role?: string;
  image?: string;
  destination?: Destination;
};

export type Credit = {
  name: string;
  role?: string;
  image?: string;
  destination?: Destination;
};

export type WebLink = {
  title: string;
  url: string;
};

export enum ContentStatus {
  UNKNOWN,
  ONGOING,
  COMPLETED,
  CANCELLED,
  HIATUS,
}

export enum ContentType {
  MANGA,
  MANHUA,
  MANHWA,
  COMIC,
  /** Hard contract: chapters are semantic text returned by getChapterText. */
  NOVEL,
}

export enum ReadingMode {
  PAGED_MANGA, // Page 2 <---- Page 1
  PAGED_COMIC, // Page 1 ----> Page 2
  PAGED_VERTICAL,
  VERTICAL,
}

export enum TrackStatus {
  UNTRACKED,
  READING,
  PLANNING,
  COMPLETED,
  PAUSED,
  DROPPED,
  REPEATING,
}

export enum ContentRating {
  EVERYONE, // Everyone
  SUGGESTIVE, // PG13
  MATURE, // PG118
  UNKNOWN, // Unknown / not provided by source
}

export type ProgressUpdate = {
  chapter?: number;
  volume?: number;
  status?: TrackStatus;
};

export type ProgressState = {
  readChapterIds?: string[];
  currentState?: CurrentReadingState;
  systemMarkBelowCurrentAsRead?: boolean; // when true, the app should mark all below currentState as read
};

export type CurrentReadingState = {
  number: number;
  volume?: number;
  page: number;
  progress: number;
  readDate: Date;

  chapterId?: string;
};

export type GroupedUpdateResponse = {
  updates: SourceUpdateItem[];
};

export type SourceUpdateItem = {
  id: string;
  count: number;
  chapters: number[];
};
