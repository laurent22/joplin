# @joplin/empty

An empty package. This package can be used to exclude certain dependencies from build.

For example, the `canvas` dependency is an optional dependency of `pdfjs-dist`. However, it isn't used by Joplin and can cause build to fail in certain environments. The `@joplin/empty` package can exclude `canvas` from the build by adding a resolution to `resolutions` in the top-level `package.json`. For example, resolving `canvas@npm:^2.11` to `file:./packages/empty/`.

See also:
- [Yarn docs: Manifest resolutions](https://yarnpkg.com/configuration/manifest#resolutions)
- [GitHub comment: Yarn: Ignoring packages](https://github.com/yarnpkg/yarn/issues/4611#issuecomment-1370284462)

