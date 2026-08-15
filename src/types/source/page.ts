import { Destination } from "./destination";
import { Item, ItemListRequest, SearchRequest } from "./item";

export type ItemPageResponse = {
  sections: ItemPageSection[];
  isLastPage: boolean;
};

export type ItemPageSection = {
  id: string;
  title: string;
  subtitle?: string;
  style?: PageSectionStyle;
  items?: Item[];
  destination?: Destination;
};

export enum PageSectionStyle {
  DEFAULT = 0,
  DETAIL_VERTICAL = 1,
  DETAIL_HORIZONTAL = 2,
  GALLERY = 3,
  LIST = 4,
  GRID = 5,
  TAG_GRID = 6,
  TAG_LIST = 7,
  BANNER = 8,
  HIGHLIGHT = 9,
  READABLE = 10,
  MOSAIC = 11,
  RANKED = 12,
  STORY_RAIL = 13,
  EDITORIAL = 14,
  THREE_STACK = 15,
  WINDOWPANE = 16,
  SIDECAR = 17,
  DUET = 18,
  TAPESTRY = 19,
}

export type HomePage = {
  feeds: HomePageFeed[];
};

export type HomePageFeed = {
  id: string;
  title: string;
  content: HomePageFeedContent;
};

export type HomePageFeedContent = {
  page?: string;
  list?: ItemListRequest;
};

export type SourceSearchRequest = SearchRequest;

export type SourceFeed = {
  id: string;
  title: string;
  content: SourceFeedContent;
};

export type SourceFeedContent = {
  page?: string;
  list?: ItemListRequest;
  search?: SourceSearchRequest;
};
