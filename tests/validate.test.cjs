const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ContentSchema,
  PagedItemListSchema,
  ChapterSchema,
  ProgressUpdateSchema,
  CurrentReadingStateSchema,
  ContentProgressDataSchema,
  UpdateItemSchema,
  RedrawSchema,
  wrapDelegateWithValidation,
  DelegateValidationError,
} = require("../dist/validate");

test("ContentSchema accepts valid content payload", () => {
  const parsed = ContentSchema.parse({
    title: "Solo Leveling",
    coverImage: "https://cdn.example.com/cover.jpg",
    rating: 0,
    additionalDetails: {
      Year: "2024",
    },
  });

  assert.equal(parsed.title, "Solo Leveling");
  assert.equal(parsed.rating, 0);
  assert.equal(parsed.additionalDetails.Year, "2024");
});

test("PagedItemListSchema rejects invalid list payload", () => {
  assert.throws(() => {
    PagedItemListSchema.parse({
      items: [{ id: "", title: "", rating: 3 }],
    });
  });
});

test("wrapDelegateWithValidation validates async delegate results", async () => {
  const delegate = wrapDelegateWithValidation(
    {
      async getItemList() {
        return {
          items: [{ id: "id-1", title: "Title 1", rating: 3 }],
          isLastPage: true,
        };
      },
    },
    "unit-test",
  );

  const result = await delegate.getItemList();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "id-1");
});

test("wrapDelegateWithValidation throws DelegateValidationError for bad payload", async () => {
  const delegate = wrapDelegateWithValidation(
    {
      async getContent() {
        return {
          title: "Broken Content",
          coverImage: "not-a-url",
          rating: 0,
        };
      },
    },
    "unit-test",
  );

  await assert.rejects(async () => {
    await delegate.getContent();
  }, DelegateValidationError);
});

test("wrapDelegateWithValidation validates willRequestImage results", async () => {
  const delegate = wrapDelegateWithValidation(
    {
      async willRequestImage(request) {
        return {
          ...request,
          headers: {
            ...request.headers,
            Referer: "https://mangadex.org/",
          },
        };
      },
    },
    "unit-test",
  );

  const result = await delegate.willRequestImage({
    url: "https://uploads.mangadex.org/data/hash/page.jpg",
  });

  assert.equal(result.url, "https://uploads.mangadex.org/data/hash/page.jpg");
  assert.equal(result.headers.Referer, "https://mangadex.org/");
});

test("wrapDelegateWithValidation validates redrawImage null results", async () => {
  const delegate = wrapDelegateWithValidation(
    {
      async redrawImage() {
        return null;
      },
    },
    "unit-test",
  );

  const result = await delegate.redrawImage({
    url: "https://cdn.example.com/page.jpg#desckey=key&cols=4",
    size: { width: 800, height: 1200 },
  });

  assert.equal(result, null);
});

test("wrapDelegateWithValidation validates redrawImage command results", async () => {
  const delegate = wrapDelegateWithValidation(
    {
      async redrawImage(request) {
        return {
          size: request.size,
          commands: [
            {
              source: {
                origin: { x: 0, y: 0 },
                size: { width: 200, height: 300 },
              },
              destination: {
                origin: { x: 200, y: 0 },
                size: { width: 200, height: 300 },
              },
            },
          ],
        };
      },
    },
    "unit-test",
  );

  const result = await delegate.redrawImage({
    url: "https://cdn.example.com/page.jpg#desckey=key&cols=4",
    size: { width: 800, height: 1200 },
  });

  assert.equal(result.size.width, 800);
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].destination.origin.x, 200);
});

test("RedrawSchema rejects malformed redraw commands", () => {
  assert.throws(() => {
    RedrawSchema.parse({
      size: { width: 800, height: 1200 },
      commands: [],
    });
  });

  assert.throws(() => {
    RedrawSchema.parse({
      size: { width: 800, height: 1200 },
      commands: [
        {
          source: {
            origin: { x: -1, y: 0 },
            size: { width: 200, height: 300 },
          },
          destination: {
            origin: { x: 0, y: 0 },
            size: { width: 200, height: 300 },
          },
        },
      ],
    });
  });
});

test("ChapterSchema accepts chapter 0 and unknown -1, rejects below -1", () => {
  const chapterZero = ChapterSchema.parse({
    id: "chapter-0",
    index: 0,
    number: 0,
    title: "Chapter 0",
  });
  assert.equal(chapterZero.number, 0);

  const unknownChapter = ChapterSchema.parse({
    id: "chapter-unknown",
    index: 0,
    number: -1,
    title: "Special",
  });
  assert.equal(unknownChapter.number, -1);

  assert.throws(() => {
    ChapterSchema.parse({
      id: "chapter-negative",
      index: 0,
      number: -2,
      title: "Legacy Sentinel",
    });
  });
});

test("ChapterSchema accepts new SourceChapter fields", () => {
  const parsed = ChapterSchema.parse({
    id: "chapter-5",
    index: 4,
    number: 5,
    volume: 1,
    isSpecial: true,
    language: "en",
    title: "Batman Annual #5",
    webUrl: "https://readcomicsonline.ru/comic/batman/annual-5",
    coverImage: "https://cdn.example.com/batman-annual-5.jpg",
    data: { source: "readcomicsonline" },
    providers: [
      {
        id: "rco",
        name: "ReadComicsOnline",
        links: [{ title: "Website", url: "https://readcomicsonline.ru" }],
      },
    ],
    isLocked: false,
  });

  assert.equal(parsed.isSpecial, true);
  assert.equal(parsed.providers[0].id, "rco");
  assert.equal(parsed.isLocked, false);
});

test("ChapterSchema rejects non-UInt32 indexes", () => {
  assert.throws(() => {
    ChapterSchema.parse({
      id: "chapter-neg",
      index: -1,
      number: 1,
    });
  });

  assert.throws(() => {
    ChapterSchema.parse({
      id: "chapter-float",
      index: 1.5,
      number: 1,
    });
  });
});

test("UpdateItemSchema accepts chapter 0 and rejects negative chapter entries", () => {
  assert.throws(() => {
    UpdateItemSchema.parse({
      id: "content-1",
      count: 1,
      chapters: [-1],
    });
  });

  const parsed = UpdateItemSchema.parse({
    id: "content-1",
    count: 2,
    chapters: [0, 2],
  });
  assert.deepEqual(parsed.chapters, [0, 2]);
});

test("Progress schemas accept 0 and reject -1", () => {
  const update = ProgressUpdateSchema.parse({ chapter: 0 });
  assert.equal(update.chapter, 0);

  assert.throws(() => {
    ProgressUpdateSchema.parse({ chapter: -1 });
  });

  const readingState = CurrentReadingStateSchema.parse({
    number: 0,
    page: 1,
    progress: 0.5,
    readDate: new Date("2026-01-01T00:00:00.000Z"),
  });
  assert.equal(readingState.number, 0);

  assert.throws(() => {
    CurrentReadingStateSchema.parse({
      number: -1,
      page: 1,
      progress: 0.5,
      readDate: new Date("2026-01-01T00:00:00.000Z"),
    });
  });
});

test("ContentProgressDataSchema readChapters accepts 0 and rejects negatives", () => {
  const arrayParsed = ContentProgressDataSchema.parse({
    readChapters: [0, 2],
  });
  assert.deepEqual(arrayParsed.readChapters, [0, 2]);

  assert.throws(() => {
    ContentProgressDataSchema.parse({
      readChapters: [-1],
    });
  });

  const setParsed = ContentProgressDataSchema.parse({
    readChapters: new Set([0, 2]),
  });
  assert.deepEqual(setParsed.readChapters, new Set([0, 2]));

  assert.throws(() => {
    ContentProgressDataSchema.parse({
      readChapters: new Set([-1]),
    });
  });
});

test("ContentProgressDataSchema accepts legacy payloads without progress", () => {
  const parsed = ContentProgressDataSchema.parse({
    status: 1,
    readChapters: [1, 2],
    lastReadDate: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.deepEqual(parsed.readChapters, [1, 2]);
  assert.equal(parsed.status, 1);
});

test("ContentProgressDataSchema accepts optional progress payloads", () => {
  const progressOnly = ContentProgressDataSchema.parse({
    progress: 12.5,
  });
  assert.equal(progressOnly.progress, 12.5);

  const combined = ContentProgressDataSchema.parse({
    readChapters: [1, 5],
    progress: 12,
  });
  assert.deepEqual(combined.readChapters, [1, 5]);
  assert.equal(combined.progress, 12);

  assert.throws(() => {
    ContentProgressDataSchema.parse({
      progress: Number.POSITIVE_INFINITY,
    });
  });
});
