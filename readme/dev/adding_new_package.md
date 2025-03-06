# Adding a new Joplin package

To add a new Joplin package (in the `/packages` folder), several factors must be considered. Please make sure you follow this documentation to ensure the package can be correctly deployed and maintained by the existing tooling.

In this documentation, replace `PACKAGE_NAME` by the name of the newly created package.

## In `package.json`

In the new package `package.json` file:

- Set the `name` to `@joplin/PACKAGE_NAME`

- Add `"publishConfig": { "access": "public" }`. Otherwise npm will try to publish the package as a private one, but we only want public packages. Also Lerna will fail when publishing the package if it is private since our repository is a free one (private packages are not supported).

- Set the `version` to the current major/minor version of Joplin.

- `license` should most likely be `AGPL-3.0-or-later`

- `repository` should be `https://github.com/laurent22/joplin/tree/dev/packages/PACKAGE_NAME`

## In `setupNewRelease.ts`

Add a line to ensure that the version number is automatically updated:

```typescript
await updatePackageVersion(`${rootDir}/packages/PACKAGE_NAME/package.json`, majorMinorVersion, options);
```

## In `.npmpackagejsonlintrc.json`

Add the name of the new packages to the exceptions. This is because Lerna set the package version number to something like `^x.y.z`, while we only support pinned versions `x.y.z`. But this is fine for Joplin-specific packages.

## In `packages/app-mobile/metro.config.js`

If the package is to be used by the mobile app, make sure you add it to the `localPackages` list:

```javascript
'@joplin/PACKAGE_NAME': path.resolve(__dirname, '../PACKAGE_NAME/'),
```