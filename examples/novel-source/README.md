# Controlled Novel Source

This private fixture builds the same deterministic HTML/plain-text novel in both
Suwatte source environments:

- `en.sample.suwatte.app.jsc` uses the legacy JavaScriptCore runtime.
- `en.sample.suwatte.app.webkit` carries the `use webkit` artifact directive.

Both thin entries inherit one shared implementation. They deliberately avoid
network resources so contract and renderer tests are repeatable. The fixture is
not a production catalog and must not be deployed as part of a source-list
release.

From this directory, after building `@suwatte/toolchain`:

```sh
../../bin/suwatte.js build
```

Generated artifacts are written to `dist/sources`. The package test suite also
builds, executes, validates, and removes these artifacts automatically.
