# Changelog

## 5.1.0 - 2026-07-14

- Added the version-1 source-publication configuration, HTML/plain-text chapter
  content, resource, progress callback, and stable source error types.
- Added strict developer-time chapter validation and the publication capability
  plus minimum-app-version gate.
- Added `minSupportedAppVersion` propagation to generated catalog metadata.
- Added one shared controlled novel sample that builds and executes in both JSC
  and WebKit environments, with migration and resource/authentication guidance.

## Unreleased

- Added optional `ContentProgressData.progress?: number` support for `getContentProgress`.
- Validation now accepts `progress` as an optional finite, non-negative number.
- `readChapters` remains fully supported and authoritative when present and non-empty.
