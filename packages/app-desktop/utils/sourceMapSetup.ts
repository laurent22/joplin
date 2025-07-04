
// source-map-support can add 1-3 seconds to the application startup
// time -- disable it unless requested:
if (process.env.JOPLIN_SOURCE_MAP_ENABLED) {
	require('source-map-support').install();
}
