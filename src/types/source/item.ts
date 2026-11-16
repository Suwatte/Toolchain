import { JsonObject, PropWrapper } from "../utils";
import { Destination } from "./destination";
import { ContentRating, Statistics, TrackStatus } from "./content";
import { FilterSchema, PopulatedFilters } from "./filter";
import { LabeledOption } from "./tag";

export type Item = {
  id: string;
  title: string;

  subtitle?: string;
  coverImage?: string;
  bannerImage?: string;
  webUrl?: string;
  statistics?: Statistics;
  rating: ContentRating;

  trackStatus?: TrackStatus;
  destination?: Destination;
  context?: JsonObject;
  /** Set when the title is a standalone work (see `Content.isStandalone`), so the app opens its page without a chapter list before the details load. */
  isStandalone?: boolean;
  /** Set when the item stands for a group of titles, such as a reading list. The app draws `covers` behind the item's own cover. */
  stack?: ItemStack;
};

/** A group of titles shown as one item. */
export type ItemStack = {
  /** How many titles the group holds. */
  count?: number;
  /** Covers of other titles in the group, nearest first. The app draws up to two. */
  covers?: string[];
};

export type ItemCollection = {
  id: string;
  title: string;
  subtitle?: string;
  items: Item[];
  destination?: Destination;
};

export type PagedItemList = {
  total?: number;
  isLastPage?: boolean;
  items: Item[];
};

export type ItemListRequest = {
  key?: string;
  sort?: SortSelection;

  /** Prevents the app from sorting this list. */
  disableSorting?: boolean;
};

export type SearchRequest<T extends FilterSchema = FilterSchema> = {
  query?: string;
  sort?: SortSelection;
  filters?: PopulatedFilters<T>;
};

export type SortSelection = {
  key: string;
  ascending?: boolean;
};

export type SortOptions = {
  options: LabeledOption[];
  /** Prevents readers from reversing the list's sort order. Defaults to false. */
  disableOrdering?: boolean;
};
