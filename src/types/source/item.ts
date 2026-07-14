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

  /* Sources can provide this flag to the application to disable sorting on certain lists*/
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
  /*  When true, users will be unable to toggle the asc/desc sorting, defaults to false if not set */
  disableOrdering?: boolean;
};
