import {
  ChapterLockedError,
  ChapterUnavailableError,
  ContentRating,
  ContentType,
  SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
  SourceChapterContentFormat,
  SourceChapterPresentation,
} from "@suwatte/toolchain/types";
import type {
  Chapter,
  Content,
  Delegate,
  Item,
  ItemListRequest,
  PagedItemList,
  SearchRequest,
  SourceChapterContent,
  SourceConfiguration,
  SourceInfo,
} from "@suwatte/toolchain/types";

export const controlledNovelInfo: Omit<SourceInfo, "id"> = {
  name: "Controlled Novel Sample",
  version: 1,
  website: "https://www.suwatte.app",
  rating: ContentRating.EVERYONE,
  minSupportedAppVersion: "7.1",
  languages: ["en"],
};

const sampleItem: Item = {
  id: "controlled-novel",
  title: "The Clockwork Garden",
  subtitle: "A deterministic source-publication fixture",
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

const htmlChapter: SourceChapterContent = {
  contractVersion: SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
  format: SourceChapterContentFormat.HTML,
  body: [
    "<main>",
    "<h1>A Door of Brass</h1>",
    "<p>Mara found the door where the ivy met the observatory wall.</p>",
    "<blockquote><p>Every careful machine leaves room for wonder.</p></blockquote>",
    "<p>Above the latch, a small brass sun waited for morning.</p>",
    "</main>",
  ].join(""),
};

const plainTextChapter: SourceChapterContent = {
  contractVersion: SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
  format: SourceChapterContentFormat.PLAIN_TEXT,
  body: [
    "Water the silverleaf before sunrise.",
    "",
    "Wind the eastern clock only after the final bell.",
  ].join("\n"),
};

/** Shared implementation used by the sibling JSC and WebKit sample entries. */
export abstract class ControlledNovelSource implements Delegate {
  getConfiguration(): SourceConfiguration {
    return {
      chapterPresentation: SourceChapterPresentation.PUBLICATION,
      chapterContentVersion: SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
    };
  }

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
      summary: "A local deterministic fixture for the Suwatte novel contract.",
      chapters,
    };
  }

  async getChapters(contentId: string): Promise<Chapter[]> {
    if (contentId !== sampleItem.id) {
      throw new ChapterUnavailableError();
    }
    return chapters;
  }

  async getChapterContent(
    contentId: string,
    chapterId: string,
  ): Promise<SourceChapterContent> {
    if (contentId !== sampleItem.id) {
      throw new ChapterUnavailableError();
    }

    switch (chapterId) {
      case "html-chapter":
        return htmlChapter;
      case "plain-text-chapter":
        return plainTextChapter;
      case "locked-chapter":
        throw new ChapterLockedError();
      default:
        throw new ChapterUnavailableError();
    }
  }

  async onChapterProgress(
    _contentId: string,
    _chapterId: string,
    _progression: number,
  ): Promise<void> {
    // Optional sample hook: production sources may synchronize this value.
  }
}
