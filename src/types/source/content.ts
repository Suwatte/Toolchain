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

  /** Additional title metadata displayed by the app. */
  statistics?: Statistics;
  credits?: Credit[];
  summary?: string;
  additionalTitles?: string[];
  additionalDetails?: Record<string, string>;

  /** Additional content sections displayed by the app. */
  genres?: Tag[];
  properties?: TagSection[];
  collections?: ItemCollection[];
  links?: WebLink[];
  characters?: Character[];

  /** Key-value identifiers used to link equivalent titles across Sources. */
  endpoints?: Record<string, string>;
  trackStatus?: TrackStatus;

  /** Opaque Source-owned context returned to later delegate calls. */
  context?: JsonObject;

  /** Chapters currently attached to this content record. */
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
  EVERYONE,
  SUGGESTIVE,
  MATURE,
  UNKNOWN,
}

export type ProgressUpdate = {
  chapter?: number;
  volume?: number;
  status?: TrackStatus;
};

export type ProgressState = {
  readChapterIds?: string[];
  currentState?: CurrentReadingState;
  /** Marks every chapter below `currentState` as read when true. */
  systemMarkBelowCurrentAsRead?: boolean;
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
