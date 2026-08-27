# @suwatte/toolchain

The official, standalone toolkit for building Source plugins for
[Suwatte](https://suwatte.mantton.com). It includes the public TypeScript
types, runtime helpers, compiler, command-line interface, emulator, and
validation schemas in one package. It does not depend on another
Suwatte-scoped package.

[Read the developer guides](https://suwatte.mantton.com/developers/introduction/)

## Requirements

- Node.js 22 or newer
- `sharp` 0.34 when emulator tests need native image processing

## Installation

```sh
npm install --save-dev @suwatte/toolchain
```

The package installs the `suwatte` command in the project.

## Project layout

Put each Source in its own directory under `src/sources`. Every Source needs an
`index.ts` file with a default export.

```text
my-catalog/
├── package.json
├── tsconfig.json
└── src/
    └── sources/
        ├── example-en/
        │   └── index.ts
        └── example-ja/
            └── index.ts
```

The default export must be a delegate class with a static `info` property.
Source metadata includes `id`, `name`, `version`, `website`, `languages`, and a
numeric `ContentRating` value. Optional static variants generate additional
artifacts from the same delegate class.

## Command line

Build the catalog:

```sh
npx suwatte build
```

The build writes installable `.stt` bundles and the source-list webpage to
`dist/`:

```text
dist/
├── sources/
│   └── example-en.stt
├── sources.json
├── index.html
├── main.css
└── catalog.js
```

Serve the same catalog on the local network for device testing:

```sh
npx suwatte serve
```

Both commands accept `-f, --folder <folder>` to change the output directory and
`--timings` to print build diagnostics. `serve` also accepts
`-p, --port <port>`; the default port is `8080`.

See [The command line](https://suwatte.mantton.com/developers/cli/) for the
device-testing workflow.

## Package exports

| Export | Purpose |
| --- | --- |
| `@suwatte/toolchain` | Public Source types and runtime helpers |
| `@suwatte/toolchain/types` | Source, content, chapter, page, and networking types |
| `@suwatte/toolchain/runtime` | Source-class and variant runtime helpers |
| `@suwatte/toolchain/emulator` | Node.js shims for stores, networking, crypto, and native images |
| `@suwatte/toolchain/validate` | Zod schemas and delegate validation helpers |

## Emulator

Use the emulator to run a Source without the app:

```ts
import emulate from "@suwatte/toolchain/emulator";
import Target from "./src/sources/example-en";

const source = emulate(Target);
const results = await source.getSearchResults({ query: "example" }, 1);
```

The emulator provides the same Source-facing globals used by the app, including
`ObjectStore`, `SecureStore`, `NetworkClient`, `HttpClient`, `NetworkError`, and
`CloudflareError`. See [The emulator](https://suwatte.mantton.com/developers/emulator/)
for reset controls and test patterns.

## Validation

The validation export checks delegate results during development without
changing the `.stt` runtime contract:

```ts
import {
  ContentSchema,
  wrapDelegateWithValidation,
} from "@suwatte/toolchain/validate";

ContentSchema.parse(contentPayload);
const validatedDelegate = wrapDelegateWithValidation(delegate, "example-en");
```

## Networking compatibility

Legacy `NetworkClient` requests cross the app's JavaScriptCore-to-Swift bridge.
Their `body` must be a plain JSON-compatible dictionary. Keep
`application/x-www-form-urlencoded` bodies as dictionaries because the native
client performs the encoding:

```ts
await client.request({
  url: `${baseUrl}/wp-admin/admin-ajax.php`,
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: { action: "manga_get_chapters", manga: mangaId },
});
```

Use `HttpClient` when a request intentionally needs a raw string or
`Uint8Array` body. The emulator rejects pre-serialized legacy form bodies so
that local tests match the native bridge.

See [Networking](https://suwatte.mantton.com/developers/networking/) for the two
network stacks and their directives.

## Identifier convention

- Language variants: `LANG.DOMAIN`
- Non-language service variants: `LANG.DOMAIN.VARIANT`
- Normalize `LANG` identifiers to lowercase, hyphenated tokens. Keep canonical
  BCP 47 casing in the metadata `languages` field.

Changing a Source identifier creates a different Source and disconnects saved
library entries from it. See [Versions](https://suwatte.mantton.com/developers/versioning/)
before changing identifiers or compatibility requirements.

## Development

```sh
npm ci
npm test
npm pack --dry-run
```

The test command performs a clean TypeScript build before running the Node.js
test suite. The package is licensed under the [MIT License](LICENSE).
