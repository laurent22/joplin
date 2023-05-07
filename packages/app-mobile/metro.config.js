/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

// The technique below to get the symlinked packages to work with the Metro
// bundler comes from this comment:
//
// https://github.com/facebook/metro/issues/1#issuecomment-501143843
//
// Perhaps also investigate this technique as it's specifically for Lerna:
//
// https://github.com/facebook/metro/issues/1#issuecomment-511228599

const path = require('path');

const localPackages = {
	'@joplin/lib': path.resolve(__dirname, '../lib/'),
	'@joplin/renderer': path.resolve(__dirname, '../renderer/'),
	'@joplin/tools': path.resolve(__dirname, '../tools/'),
	'@joplin/fork-htmlparser2': path.resolve(__dirname, '../fork-htmlparser2/'),
	'@joplin/fork-uslug': path.resolve(__dirname, '../fork-uslug/'),
	'@joplin/react-native-saf-x': path.resolve(__dirname, '../react-native-saf-x/'),
	'@joplin/react-native-alarm-notification': path.resolve(__dirname, '../react-native-alarm-notification/'),
	'@joplin/react-native-vosk': path.resolve(__dirname, '../react-native-vosk/'),
};

const watchedFolders = [];
for (const [, v] of Object.entries(localPackages)) {
	watchedFolders.push(v);
}

module.exports = {
	transformer: {
		getTransformOptions: async () => ({
			transform: {
				experimentalImportSupport: false,
				inlineRequires: true,
			},
		}),
	},
	resolver: {
		// This configuration allows you to build React-Native modules and test
		// them without having to publish the module. Any exports provided by
		// your source should be added to the "target" parameter. Any import not
		// matched by a key in target will have to be located in the embedded
		// app's node_modules directory.
		//
		extraNodeModules: new Proxy(
			// The first argument to the Proxy constructor is passed as "target"
			// to the "get" method below. Put the names of the libraries
			// included in your reusable module as they would be imported when
			// the module is actually used.
			//
			localPackages,
			{
				get: (target, name) => {
					if (target.hasOwnProperty(name)) {
						return target[name];
					}
					return path.join(process.cwd(), `node_modules/${name}`);
				},
			}
		),
	},
	projectRoot: path.resolve(__dirname),
	watchFolders: watchedFolders,
};
