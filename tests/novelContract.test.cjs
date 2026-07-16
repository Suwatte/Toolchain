const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ChapterLockedError,
  ChapterUnavailableError,
  ContentType,
  SOURCE_CHAPTER_TEXT_LIMITS,
  SourceChapterTextFormat,
} = require("../dist/types");
const {
  SourceChapterTextSchema,
  canonicalSourceChapterResourceHref,
  wrapDelegateWithValidation,
} = require("../dist/validate");

const validContent = () => ({
  format: SourceChapterTextFormat.HTML,
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

test("source chapter text accepts the wire shape and defaults resources", () => {
  const parsed = SourceChapterTextSchema.parse({
    format: SourceChapterTextFormat.PLAIN_TEXT,
    body: "Literal text",
  });

  assert.deepEqual(parsed.resources, []);
  assert.equal(parsed.format, "plainText");
  assert.equal(SOURCE_CHAPTER_TEXT_LIMITS.body, 2 * 1024 * 1024);
  assert.equal(SOURCE_CHAPTER_TEXT_LIMITS.bridgePayload, 4 * 1024 * 1024);
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
  assert.throws(() => SourceChapterTextSchema.parse(duplicate));
});

test("resource URLs require credential-free host-bearing HTTP(S)", () => {
  const credentialed = validContent();
  credentialed.resources[0].url = "https://user:secret@cdn.example.com/hero.jpg";
  assert.throws(() => SourceChapterTextSchema.parse(credentialed));

  const customScheme = validContent();
  customScheme.resources[0].url = "file:///tmp/hero.jpg";
  assert.throws(() => SourceChapterTextSchema.parse(customScheme));

  assert.doesNotThrow(() => SourceChapterTextSchema.parse(validContent()));
});

test("developer validation enforces UTF-8 body and complete bridge bounds", () => {
  const oversizedBody = validContent();
  oversizedBody.body = "🙂".repeat(
    Math.floor(SOURCE_CHAPTER_TEXT_LIMITS.body / 4) + 1,
  );
  assert.throws(() => SourceChapterTextSchema.parse(oversizedBody));

  const oversizedBridge = validContent();
  oversizedBridge.resources[0].context = {
    token: "x".repeat(SOURCE_CHAPTER_TEXT_LIMITS.bridgePayload),
  };
  assert.throws(() => SourceChapterTextSchema.parse(oversizedBridge));
});

test("novel remains the single source-facing text declaration", () => {
  assert.equal(ContentType.NOVEL, 4);
});

test("delegate wrapping validates getChapterText and stable errors use app names", async () => {
  const delegate = wrapDelegateWithValidation({
    async getChapterText() {
      return validContent();
    },
  });
  const content = await delegate.getChapterText("content", "chapter");
  assert.equal(content.body, "<p>Hello, publication.</p>");

  assert.equal(new ChapterUnavailableError().name, "ChapterUnavailable");
  assert.equal(new ChapterLockedError().name, "ChapterLocked");
});
