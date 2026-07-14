import { ChapterRequest } from "./chapter";
import { ItemListRequest } from "./item";
import { PropWrapper } from "../utils";

/**
 * Source Action:
 *
 * These are actions that can be carried out by the application, from opening a URL to calling a method from the delegate.
 *
 * The object structure of the union types are formatted to be properly decodable by the swift Codable protocol.
 */
export type Destination =
  | URLDestination
  | ContentDestination
  | ItemPageDestination
  | ChapterDestination
  | ItemListDestination
  | NoDestination;

/**
 * This action instructs the app to open a url in a webview
 */
export type URLDestination = PropWrapper<"url", string>;

/**
 * This action instructs the app to open a detailed content view for the provided id
 */
export type ContentDestination = PropWrapper<"content", string>;

/**
 * Instructs the app to open a page view with the provided page request
 */
export type ItemPageDestination = PropWrapper<"page", string>;

/**
 * Instructs the app to open a chapter with the provided chapter request
 */
export type ChapterDestination = PropWrapper<"chapter", ChapterRequest>;
/**
 * Instructs the app to open a chapter with the provided item list request
 */
export type ItemListDestination = PropWrapper<"list", ItemListRequest>;

export type NoDestination = PropWrapper<"empty", Record<string, never>>;

// Utility methods
export function URLDestination(
  props: string,
  title: string | null = null,
): URLDestination {
  return {
    url: {
      props,
      title,
    },
  };
}

export function ContentDestination(
  props: string,
  title: string | null = null,
): ContentDestination {
  return {
    content: {
      props,
      title,
    },
  };
}

export function ItemPageDestination(
  props: string,
  title: string | null = null,
): ItemPageDestination {
  return {
    page: {
      props,
      title,
    },
  };
}
export function ChapterDestination(props: ChapterRequest): ChapterDestination {
  return {
    chapter: {
      props,
    },
  };
}
export function ItemListDestination(
  props: ItemListRequest,
  title: string | null = null,
): ItemListDestination {
  return {
    list: {
      props,
      title,
    },
  };
}

export function NoDestination(): NoDestination {
  return {
    empty: {
      props: {},
    },
  };
}
