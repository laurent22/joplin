// This file allows specific libraries to be excluded from autolinking.
// https://github.com/react-native-community/cli/blob/main/docs/autolinking.md

module.exports = {
	dependencies: {
		// Disable linking react-native-zip-archive on iOS: it's only used on Android and, unless the
		// minimum iOS version is increased, breaks the iOS build.
		// See https://github.com/mockingbot/react-native-zip-archive/issues/307.
		'react-native-zip-archive': {
			platforms: {
				ios: null,
			},
		},
	},
};
