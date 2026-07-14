# Novel chapter-content contract (v1)

Toolchain 5.1.0 adds the source-publication contract used by Suwatte 7.1 and
newer. It is opt-in and source-wide. Existing image sources require no changes.

## Compatibility declaration

A publication source must set all three parts of the capability gate:

1. `SourceInfo.minSupportedAppVersion` is `"7.1"` or newer.
2. `getConfiguration()` returns `chapterPresentation: "publication"` and
   `chapterContentVersion: 1`.
3. The delegate implements `getChapterContent(contentId, chapterId)`.

The app derives `chapterContentProviding` at runtime only when the declaration,
exact version, and method are all present. It never stores that capability and
never falls back to image pages after a publication request fails. Missing or
future declarations remain on the legacy image-page path.

Catalog metadata carries `minSupportedAppVersion`. Version-7 clients use the
existing numeric compatibility gate to hide or reject a 7.1-only install or
update; 7.1 and newer clients accept it.

```ts
import {
  SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
  SourceChapterPresentation,
  type SourceConfiguration,
  type SourceInfo,
} from "@suwatte/toolchain/types";

static readonly info: SourceInfo = {
  // existing fields...
  minSupportedAppVersion: "7.1",
};

getConfiguration(): SourceConfiguration {
  return {
    chapterPresentation: SourceChapterPresentation.PUBLICATION,
    chapterContentVersion: SOURCE_CHAPTER_CONTENT_CONTRACT_VERSION,
  };
}
```

## Chapter response

`getChapterContent` returns one `SourceChapterContent`:

```ts
return {
  contractVersion: 1,
  format: SourceChapterContentFormat.HTML,
  body: "<main><h1>Chapter one</h1><p>...</p></main>",
  resources: [
    {
      href: "images/hero.jpg",
      url: "https://cdn.example.com/books/1/hero.jpg",
      mediaType: "image/jpeg",
      context: { requestKind: "chapter-image" },
    },
  ],
};
```

`format: "html"` is untrusted semantic markup. Suwatte removes authored style,
scripts, forms, frames, unsafe links, unknown resources, and active content
before rendering. `format: "plainText"` is literal text and is escaped by the
app. Do not return a complete scripted web page or depend on authored CSS.

The exact v1 limits are:

| Field | Limit |
| --- | ---: |
| Serialized bridge response | 4 MiB UTF-8 |
| Body | 2 MiB UTF-8, non-empty |
| Resources | 512 |
| Resource `href` | 2,048 UTF-8 bytes |
| Resource `url` | 8,192 UTF-8 bytes |
| Resource `mediaType` | 256 UTF-8 bytes |

The toolchain validator applies these bounds before a fixture reaches the app.
It also canonicalizes each `href` through at most four percent-decoding layers,
rejects traversal, absolute/scheme-relative paths, queries, fragments,
backslashes and controls, and rejects duplicate canonical identities.

## Resources and authentication

In v1, authored chapter resources are raster images referenced by a canonical
relative HTML `src`. Fonts, stylesheets, media, SVG and scripts do not receive
resource authority. Each resource table entry must obey these rules:

- `href` is a stable relative publication identity such as
  `images/chapter-1/hero.jpg`; it is not a network URL.
- `url` is an absolute host-bearing `http` or `https` URL. Embedded username or
  password credentials are rejected. Return a currently valid signed URL when
  a provider uses expiring query tokens.
- `context` is optional JSON request metadata. It is transient and should carry
  only what the source's existing request/image interceptors need; do not put
  durable user secrets in it.
- Suwatte resolves only declared, sanitized image references. The navigator
  never receives the remote URL directly. Acquisition remains inside the
  source-owned networking path so existing cookies, referer rules, request
  overrides, client transforms, and authentication behavior are preserved.
- A response must describe only the current chapter. Unknown or undeclared
  resource references are removed, not fetched.

Use `ChapterLockedError` when the current user lacks access and
`ChapterUnavailableError` when content cannot be supplied. Their JavaScript
`Error.name` values are the stable app names `ChapterLocked` and
`ChapterUnavailable`; custom messages are diagnostic only. Other failures are
treated as bounded generic source errors.

## Progress callback

`onChapterProgress(contentId, chapterId, progression)` is optional. The app
coalesces callbacks and sends only finite chapter-local values clamped to
`0...1`. Publication chapters never emit `onPageRead`.

## Migrating an image source

1. Decide whether every readable chapter in the source can use the publication
   path. Mixed image/publication chapters are not supported in v1.
2. Raise `minSupportedAppVersion` to at least `7.1` before distributing the
   changed artifact.
3. Add the source-wide configuration and implement `getChapterContent` without
   removing `getChapters`.
4. Return semantic HTML or literal plain text. Move each supported image into
   the explicit resource table and preserve existing request authentication.
5. Throw the stable locked/unavailable errors instead of returning page arrays
   or partial content.
6. Validate representative, oversized, malformed, authenticated, unavailable,
   cancellation, and update cases in the emulator before catalog publication.
7. Test the artifact in both runtime environments that it declares. Do not add
   `use webkit` to a JSC build or use JSC-only globals in a WebKit build.

## Controlled sample and tests

[`examples/novel-source`](../examples/novel-source/README.md) contains one
shared deterministic implementation with thin JSC and WebKit entries. It
includes an HTML chapter, a plain-text chapter, stable error cases, and no
network dependency. Its `legacy-v7` subproject supplies the image-page
predecessor with identical source/content/chapter IDs for controlled upgrade
testing. These fixtures are intentionally not part of a production catalog.

```sh
npm test
```

The suite compiles the legacy artifact plus both current artifacts, verifies
their stable identities, environment stamps, version transition, and 7.1
catalog floor, executes each bundle, validates both response formats and stable
errors, and removes generated sample output.
