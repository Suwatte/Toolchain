# Changelog

## 5.1.0 - 2026-07-14

- Added `ContentType.NOVEL` routing and the HTML/plain-text `getChapterText`
  contract, including resources, progress callbacks, and stable source errors.
- Added strict developer-time validation for chapter text and resources.
- Added `minSupportedAppVersion` propagation to generated catalog metadata.

## Unreleased

- Added optional `ContentProgressData.progress?: number` support for `getContentProgress`.
- Validation now accepts `progress` as an optional finite, non-negative number.
- `readChapters` remains fully supported and authoritative when present and non-empty.
