import { ContentRating, ContentType } from "@suwatte/toolchain/types";
import type {
  Chapter,
  Content,
  Delegate,
  Item,
  ItemListRequest,
  PagedItemList,
  SearchRequest,
  SourceInfo,
} from "@suwatte/toolchain/types";

const sampleItem: Item = {
  id: "controlled-novel",
  title: "The Clockwork Garden",
  subtitle: "A deterministic legacy image-page fixture",
  rating: ContentRating.EVERYONE,
};

const chapters: Chapter[] = [
  {
    id: "html-chapter",
    index: 0,
    number: 1,
    title: "A Door of Brass",
    language: "en",
  },
  {
    id: "plain-text-chapter",
    index: 1,
    number: 2,
    title: "The Gardener's Note",
    language: "en",
  },
];

const transparentPNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/**
 * Image-page predecessor for the controlled publication sample. It deliberately
 * uses only legacy delegate methods and omits a minimum app version.
 */
export default class ControlledNovelLegacySource implements Delegate {
  static readonly info: SourceInfo = {
    id: "en.sample.suwatte.app.jsc",
    name: "Controlled Novel Sample",
    version: 0.9,
    website: "https://www.suwatte.app",
    rating: ContentRating.EVERYONE,
    languages: ["en"],
  };

  async getSearchResults(
    _request: SearchRequest,
    _page: number,
  ): Promise<PagedItemList> {
    return { items: [sampleItem], isLastPage: true, total: 1 };
  }

  async getItemList(
    _request: ItemListRequest,
    _page: number,
  ): Promise<PagedItemList> {
    return { items: [sampleItem], isLastPage: true, total: 1 };
  }

  async getContent(contentId: string): Promise<Content> {
    if (contentId !== sampleItem.id) {
      throw new Error("Unknown controlled sample content.");
    }

    return {
      title: sampleItem.title,
      coverImage: "https://www.suwatte.app/favicon.svg",
      rating: ContentRating.EVERYONE,
      contentType: ContentType.NOVEL,
      summary: "The image-page predecessor for the controlled novel fixture.",
      chapters,
    };
  }

  async getChapters(contentId: string): Promise<Chapter[]> {
    if (contentId !== sampleItem.id) {
      throw new Error("ChapterUnavailable");
    }
    return chapters;
  }

  async getChapterPages(contentId: string, chapterId: string) {
    if (
      contentId !== sampleItem.id ||
      !chapters.some((chapter) => chapter.id === chapterId)
    ) {
      throw new Error("ChapterUnavailable");
    }
    return [{ b64: transparentPNG }];
  }
}
