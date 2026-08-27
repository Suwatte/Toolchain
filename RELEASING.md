# Releasing

Publishing `@suwatte/toolchain` is an explicit maintainer action. Do not publish
a package, create a release, or push a release tag without approval from the
project owner.

## One-time setup

1. Choose the public GitHub repository that will own the package and configure
   it as this repository's `origin`.
2. Add that exact, case-sensitive repository URL to `package.json`. npm uses it
   to link provenance to the public source repository.
3. Confirm that the `suwatte` npm organization exists and that the publishing
   maintainer has two-factor authentication enabled.
4. Create a GitHub environment named `npm` and require maintainer approval for
   deployments to it.

The npm package must exist before npm can attach a trusted publisher. For the
first approved release only, authenticate interactively and publish from a
clean checkout:

```sh
npm ci
npm test
npm pack --dry-run
npm publish --access public
```

After the first release, configure the package's npm trusted publisher with:

- Provider: GitHub Actions
- Repository: the repository selected above
- Workflow: `npm-publish.yml`
- Environment: `npm`
- Allowed action: `npm publish`

Then set npm publishing access to require two-factor authentication and
disallow tokens. The workflow uses short-lived OIDC credentials and does not
need an npm token or repository secret.

Publish the GitHub release tagged `v1.0.0` after trusted publishing is
configured. The release workflow detects that the manually published version
already exists and exits without attempting to publish it again.

## Subsequent releases

1. Update `version` in `package.json` and `package-lock.json` according to
   semantic versioning.
2. Run `npm ci`, `npm test`, `npm audit --omit=dev`, and
   `npm pack --dry-run` from a clean checkout.
3. Inspect the tarball contents and public API changes.
4. Create and publish a GitHub release tagged `v<package-version>`.
5. Approve the `npm` environment deployment after the workflow reaches the
   publish job.
6. Confirm the version, public visibility, provenance, and install command on
   npm after the workflow completes.

The workflow rejects a release tag that does not exactly match the version in
`package.json`. Re-running a release workflow is safe: when that exact version
already exists on npm, the publish step is skipped.
