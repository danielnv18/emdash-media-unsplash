# Publishing releases

The package is published to npm from `.github/workflows/publish.yml` using npm trusted publishing. The first publication must be made by an npm account with publishing access because the package must exist before a trusted publisher can be configured.

## Configure trusted publishing

After the first publication, open the package settings on npmjs.com and add a GitHub Actions trusted publisher with these values:

- Organization or user: `danielnv18`
- Repository: `emdash-media-unsplash`
- Workflow filename: `publish.yml`
- Environment name: leave blank
- Allowed actions: enable direct `npm publish`

The workflow uses a GitHub-hosted runner, Node 24, and `id-token: write`. npm automatically attaches provenance for public packages published from public repositories through trusted publishing. Do not add an npm access token to the workflow. A newly configured trusted publisher expires if its first successful publish does not occur within two days.

## Release a version

1. Update the version in `package.json` and `package-lock.json`, and merge the change into `main`.
2. Review the package contents and validate the integration in an EmDash site.
3. Create and push a tag that matches the version, for example `v0.2.1` for `0.2.1`.
4. Check the Publish to npm workflow in GitHub Actions. The workflow checks the version and that the tagged commit is on `main`, runs package checks, then publishes. Only stable versions of the form `vMAJOR.MINOR.PATCH` are accepted.

Every npm version can be published only once. Configure the trusted publisher only when a new version is ready to release. If a release fails before publication, correct the problem and rerun the workflow; if the version was published, create a new version.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [publishing packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).
