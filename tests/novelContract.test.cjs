const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ChapterLockedError,
  ChapterUnavailableError,
  SOURCE_CHAPTER_CONTENT_LIMITS,
  SourceChapterContentFormat,
  SourceChapterPresentation,
} = require("../dist/types");
const {
  MINIMUM_PUBLICATION_APP_VERSION,
  SourceChapterContentSchema,
  canonicalSourceChapterResourceHref,
  compareNumericVersions,
  hasSourceChapterContentCapability,
  validateSourcePublicationContract,
  wrapDelegateWithValidation,
} = require("../dist/validate");

const validContent = () => ({
  contractVersion: 1,
  format: SourceChapterContentFormat.HTML,
  body: "<p>Hello, publication.</p>",
  resources: [
    {
      href: "images/hero.jpg",
      url: "https://cdn.example.com/hero.jpg",
      mediaType: "image/jpeg",
      context: { chapter: "one" },
    },
  ],
});

test("source chapter content accepts the exact v1 wire shape and defaults resources", () => {
  const parsed = SourceChapterContentSchema.parse({
    contractVersion: 1,
    format: SourceChapterContentFormat.PLAIN_TEXT,
    body: "Literal text",
  });

  assert.deepEqual(parsed.resources, []);
  assert.equal(parsed.contractVersion, 1);
  assert.equal(parsed.format, "plainText");
  assert.equal(SOURCE_CHAPTER_CONTENT_LIMITS.body, 2 * 1024 * 1024);
  assert.equal(SOURCE_CHAPTER_CONTENT_LIMITS.bridgePayload, 4 * 1024 * 1024);
});

test("canonical href validation rejects traversal and duplicate decoded identities", () => {
  assert.equal(
    canonicalSourceChapterResourceHref("images/%68ero.jpg"),
    "images/hero.jpg",
  );
  assert.equal(canonicalSourceChapterResourceHref("%252e%252e/secret"), null);
  assert.equal(canonicalSourceChapterResourceHref("https://example.com/a"), null);
  assert.equal(canonicalSourceChapterResourceHref("images/hero.jpg?token=1"), null);

  const duplicate = validContent();
  duplicate.resources.push({
    href: "images/%68ero.jpg",
    url: "https://cdn.example.com/other.jpg",
  });
  assert.throws(() => SourceChapterContentSchema.parse(duplicate));
});

test("resource URLs require credential-free host-bearing HTTP(S)", () => {
  const credentialed = validContent();
  credentialed.resources[0].url = "https://user:secret@cdn.example.com/hero.jpg";
  assert.throws(() => SourceChapterContentSchema.parse(credentialed));

  const customScheme = validContent();
  customScheme.resources[0].url = "file:///tmp/hero.jpg";
  assert.throws(() => SourceChapterContentSchema.parse(customScheme));

  assert.doesNotThrow(() => SourceChapterContentSchema.parse(validContent()));
});

test("developer validation enforces UTF-8 body and complete bridge bounds", () => {
  const oversizedBody = validContent();
  oversizedBody.body = "🙂".repeat(
    Math.floor(SOURCE_CHAPTER_CONTENT_LIMITS.body / 4) + 1,
  );
  assert.throws(() => SourceChapterContentSchema.parse(oversizedBody));

  const oversizedBridge = validContent();
  oversizedBridge.resources[0].context = {
    token: "x".repeat(SOURCE_CHAPTER_CONTENT_LIMITS.bridgePayload),
  };
  assert.throws(() => SourceChapterContentSchema.parse(oversizedBridge));
});

test("capability and app-version gates mirror the app contract", () => {
  const info = {
    id: "en.sample.suwatte.app.jsc",
    name: "Controlled Novel Sample",
    version: 1,
    website: "https://www.suwatte.app",
    rating: 0,
    minSupportedAppVersion: MINIMUM_PUBLICATION_APP_VERSION,
    languages: ["en"],
  };
  const configuration = {
    chapterPresentation: SourceChapterPresentation.PUBLICATION,
    chapterContentVersion: 1,
  };
  const delegate = {
    async getChapters() {
      return [];
    },
    async getChapterContent() {
      return validContent();
    },
  };

  assert.equal(hasSourceChapterContentCapability(configuration, delegate), true);
  assert.equal(
    hasSourceChapterContentCapability(
      { ...configuration, chapterContentVersion: 2 },
      delegate,
    ),
    false,
  );
  assert.doesNotThrow(() =>
    validateSourcePublicationContract(info, configuration, delegate),
  );
  assert.throws(() =>
    validateSourcePublicationContract(
      { ...info, minSupportedAppVersion: "7" },
      configuration,
      delegate,
    ),
  );
  assert.equal(compareNumericVersions("7", "7.1"), -1);
  assert.equal(compareNumericVersions("7.1.0", "7.1"), 0);
  assert.equal(compareNumericVersions("7.2", "7.1.9"), 1);
});

test("delegate wrapping validates getChapterContent and stable errors use app names", async () => {
  const delegate = wrapDelegateWithValidation({
    async getChapterContent() {
      return validContent();
    },
  });
  const content = await delegate.getChapterContent("content", "chapter");
  assert.equal(content.body, "<p>Hello, publication.</p>");

  assert.equal(new ChapterUnavailableError().name, "ChapterUnavailable");
  assert.equal(new ChapterLockedError().name, "ChapterLocked");
});
