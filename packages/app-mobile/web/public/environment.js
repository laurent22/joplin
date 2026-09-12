// __DEV__ is defined at build time by webpack (see web/webpack.config.ts), so
// that release builds never include the React Refresh runtime, regardless of
// the hostname the app is served from. See https://github.com/laurent22/joplin/issues/16435

// Silences errors related to generated code.
window.exports = {};

// Expo libraries expect window.process variable to be defined.
window.process = {
	env: {
		EXPO_OS: 'web',
	},
};
