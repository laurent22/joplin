
// source-map-support can add 1-3 seconds to the application startup
// time. In the future, it may make sense to either:
// - Use Sentry for resolving source maps: https://docs.sentry.io/platforms/javascript/guides/electron/sourcemaps/
// - Use NodeJS source map support (if https://github.com/electron/electron/issues/38875 is resolved)
if (!process.env.JOPLIN_SOURCE_MAP_DISABLED) {
	require('source-map-support').install();
}
