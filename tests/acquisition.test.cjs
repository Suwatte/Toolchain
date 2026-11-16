const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ChapterSchema,
  ContentSchema,
  wrapDelegateWithValidation,
} = require("../dist/validate");

const chapter = (acquisitions) => ({
  id: "c1",
  index: 0,
  number: 1,
  acquisitions,
});
const file = {
  url: "https://files.example.com/v1.cbz",
  headers: { Referer: "https://example.com/" },
};

test("chapter and title acquisitions keep their request, and bad ones are rejected", () => {
  const parsed = ChapterSchema.parse(
    chapter([
      {
        id: "hq",
        format: "cbz",
        request: file,
        title: "Digital (HQ)",
        byteCount: 52_000_000,
      },
      { id: "signed", format: "pdf", resolveBeforeDownload: true },
    ]),
  );
  assert.deepEqual(parsed.acquisitions[0].request.headers, {
    Referer: "https://example.com/",
  });
  assert.equal(parsed.acquisitions[1].request, undefined);

  // Local servers are allowed; credentials in the URL are not.
  ContentSchema.parse({
    title: "Omnibus",
    coverImage: "https://cdn.example.com/cover.jpg",
    rating: 0,
    acquisitions: [
      {
        id: "omnibus",
        format: "epub",
        request: { url: "http://192.168.1.20:8790/files/omnibus.epub" },
      },
    ],
  });

  const rejected = [
    [{ id: "a", format: "cbz" }], // no request and not resolved
    [{ id: "a", format: "cbz", resolveBeforeDownload: true, request: file }], // resolved, yet with a stored link
    [
      {
        id: "a",
        format: "cbz",
        request: { ...file, headers: { "X-Edition": 3 } },
      },
    ], // headers are sent as strings
    [{ id: "a", format: "zip", request: file }], // unknown format
    [
      {
        id: "a",
        format: "cbz",
        request: { url: "https://user:pass@files.example.com/a.cbz" },
      },
    ],
    [
      {
        id: "a",
        format: "cbz",
        request: { url: "ftp://files.example.com/a.cbz" },
      },
    ],
    [
      { id: "a", format: "cbz", request: file },
      { id: "a", format: "pdf", request: file },
    ],
  ];
  for (const acquisitions of rejected) {
    assert.equal(
      ChapterSchema.safeParse(chapter(acquisitions)).success,
      false,
      JSON.stringify(acquisitions),
    );
  }
});

test("resolved files need a resolver, and its results are validated", async () => {
  const signed = [
    chapter([{ id: "signed", format: "pdf", resolveBeforeDownload: true }]),
  ];
  const content = {
    title: "Omnibus",
    coverImage: "https://cdn.example.com/cover.jpg",
    rating: 0,
    chapters: signed,
  };
  const withoutResolver = wrapDelegateWithValidation({
    async getChapters() {
      return signed;
    },
    async getContent() {
      return content;
    },
  });
  await assert.rejects(withoutResolver.getChapters("t"), /resolveAcquisition/);
  await assert.rejects(
    withoutResolver.getContent("t"),
    /chapters\.0\.acquisitions\.0/,
  );

  const delegate = wrapDelegateWithValidation({
    async getChapters() {
      return signed;
    },
    async resolveAcquisition({ acquisitionId }) {
      return acquisitionId === "good" ? file : { url: "javascript:alert(1)" };
    },
  });
  assert.equal((await delegate.getChapters("t")).length, 1);
  assert.equal(
    (
      await delegate.resolveAcquisition({
        contentId: "t",
        acquisitionId: "good",
        chapterId: "c1",
      })
    ).url,
    file.url,
  );
  await assert.rejects(
    delegate.resolveAcquisition({ contentId: "t", acquisitionId: "bad" }),
  );
});
