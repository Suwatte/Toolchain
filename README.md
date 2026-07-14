# @suwatte/toolchain

Unified package for Suwatte source types, runtime, emulator, compiler, and CLI.

## Install

```sh
npm i @suwatte/toolchain
```

## Exports

- `@suwatte/toolchain`
- `@suwatte/toolchain/types`
- `@suwatte/toolchain/runtime`
- `@suwatte/toolchain/emulator`
- `@suwatte/toolchain/validate`

## CLI

### Build

```sh
suwatte build [--webpage] [-f <folder>]
```

Default output:

- `.stt` bundles under `stt/sources`
- `stt/sources.json`

Pass `--webpage` to also emit:

- `stt/index.html`
- `stt/main.css`
- `stt/catalog.js`

### Serve

```sh
suwatte serve [-p <port>] [-f <folder>]
```

`serve` always builds with webpage assets enabled before hosting.

## Source Authoring Contract

Each source directory must include:

- `index.ts` default export

The default export is a delegate class with static `info: SourceInfo`. Source
metadata must include `id`, `name`, `version`, `website`, `languages`, and the
numeric `ContentRating` value. Optional static variants produce additional
artifacts from the same class.

Toolchain generates bootstrap wrappers automatically per emitted variant.

### Novel publication chapters

Toolchain 5.1.0 includes the versioned HTML/plain-text chapter contract, strict
developer validation, stable locked/unavailable errors, optional chapter
progress callbacks, and a controlled JSC/WebKit sample. Publication artifacts
must declare `minSupportedAppVersion: "7.1"` or newer.

See [Novel chapter-content contract (v1)](docs/novel-chapter-content.md) for the
wire shape, migration steps, resource/authentication rules, limits, and sample.

## ID Convention

- Language variants: `LANG.DOMAIN`
- Non-language service variants: `LANG.DOMAIN.VARIANT`
- `LANG` IDs are normalized lowercase/hyphen tokens; metadata `languages` remain canonical BCP-47 casing.

## Emulator

`@suwatte/toolchain/emulator` provides:

- `emulateSourceEntry(...)` and default `emulate(...)`
- runtime controls: `installEmulatorGlobals`, `resetEmulatorStores`, `resetEmulatorRuntime`
- built-in shims for `ObjectStore`, `SecureStore`, `NetworkClient`, `NetworkError`, `CloudflareError`

This is the recommended path for local source testing and script-based execution.

## Validation

`@suwatte/toolchain/validate` provides zod schemas for public toolchain types and
helpers for validating delegate outputs in tests.

```ts
import {
  ContentSchema,
  wrapDelegateWithValidation,
} from "@suwatte/toolchain/validate";

ContentSchema.parse(contentPayload);
const validatedDelegate = wrapDelegateWithValidation(delegate, "MySource");
```

Validation helpers are test/developer focused and do not change `.stt` runtime contracts.

## `getContentProgress` Return Shape

`getContentProgress` may return `ContentProgressData | null` with:

- `readChapters?: number[] | Set<number>` for sparse/non-contiguous reads (preferred when available)
- `progress?: number` for contiguous reads up to a max chapter number
- `status?: TrackStatus`
- `lastReadDate?: Date`

Precedence behavior in app runtime:

1. If `readChapters` is present and non-empty, it is authoritative.
2. Else if `progress` is present, chapters with `chapter.number <= progress` are treated as read.
3. Sync is add-only; returned progress data should not be used to unmark chapters.

Examples:

```ts
// Sparse/non-contiguous history
return { readChapters: [1, 2, 5, 8], status: TrackStatus.READING };

// Contiguous progress up to chapter 42
return { progress: 42, status: TrackStatus.READING };
```
