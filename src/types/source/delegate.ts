import {
  Item,
  ItemListRequest,
  PagedItemList,
  SearchRequest,
  SortOptions,
} from "./item";
import { Content, TrackStatus } from "./content";
import { Chapter, ChapterPage, SourceChapterText } from "./chapter";
import { HomePage, ItemPageResponse, SourceFeed } from "./page";
import { SourceConfiguration } from "./configuration";
import { SearchFilter } from "./filter";
import { PopulatedForm, UIForm as UIForm } from "./form";
import { Redraw, RedrawImageRequest } from "./image";
import { NetworkRequest } from "../networking";

export type ContentProgressData = {
  status?: TrackStatus;
  /**
   * Preferred when read state is sparse or non-contiguous.
   * When present and non-empty, this field is authoritative over `progress`.
   */
  readChapters?: number[] | Set<number>;
  /**
   * Preferred when read state is contiguous up to a max chapter number.
   * Used when `readChapters` is missing or empty.
   */
  progress?: number;
  lastReadDate?: Date;
};

export type LibrarySyncResponse = {
  full: Item[];
};

export interface Delegate {
  getConfiguration?(): SourceConfiguration;
  getHomePage?(): Promise<HomePage>;

  getSearchResults(
    request: SearchRequest,
    page: number,
  ): Promise<PagedItemList>;
  getSortOptions?(): Promise<SortOptions>;
  getSearchFilters?(): Promise<SearchFilter[]>;
  getCustomFeeds?(): Promise<SourceFeed[]>;
  getSettingsPage?(): Promise<UIForm | null>;
  onFormSubmitted?(id: string, data: PopulatedForm): Promise<void>;
  handleOAuthCallback?(response: string): Promise<void>;
  clearAuthentication?(): Promise<void>;

  /**
   * fetches a paged list of items based of a provided request
   * @param request
   */
  getItemList(request: ItemListRequest, page: number): Promise<PagedItemList>;

  /**
   * fetches a custom item page for a provided request
   * @param request
   */
  getItemPage?(key: string, page: number): Promise<ItemPageResponse>;

  /**
   * called to resolve a specific section on a page if not pre-resolved
   * @param section
   */
  getPageSectionItems?(sectionKey: string, pageKey: string): Promise<Item[]>;

  // Content
  getContent(contentId: string): Promise<Content>;
  getChapters?(contentId: string): Promise<Chapter[]>;
  getChapterPages?(
    contentId: string,
    chapterId: string,
  ): Promise<ChapterPage[]>;
  /**
   * Returns semantic HTML or literal plain text for ContentType.NOVEL titles.
   * A source containing both novels and image-based titles implements both
   * chapter methods; the title's contentType selects the method.
   * The app never falls back to getChapterPages when this method fails.
   */
  getChapterText?(
    contentId: string,
    chapterId: string,
  ): Promise<SourceChapterText>;
  willRequestImage?(request: NetworkRequest): Promise<NetworkRequest>;
  redrawImage?(request: RedrawImageRequest): Promise<Redraw | null>;

  synchronizeLibrary?(
    since: Date | string,
    added: string[],
    removed: string[],
  ): Promise<LibrarySyncResponse | null>;

  // Events
  onContentsAddedToLibrary?(ids: string[]): Promise<void>;
  onContentsRemovedFromLibrary?(ids: string[]): Promise<void>;
  onChaptersMarked?(
    id: string,
    chapters: number[],
    isRead: boolean,
  ): Promise<void>;
  onPageRead?(
    contentId: string,
    chapterId: string,
    page: number,
  ): Promise<void>;
  /** Optional finite chapter-local progression callback, normalized to 0...1. */
  onChapterProgress?(
    contentId: string,
    chapterId: string,
    progression: number,
  ): Promise<void>;

  // Trackers
  getTrackEntryPage?(id: string): Promise<UIForm>;
  getContentProgress?(id: string): Promise<ContentProgressData | null>;
}
