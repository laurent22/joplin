// Metro configuration for React Native
// https://reactnative.dev/docs/metro

// The technique below to get the symlinked packages to work with the Metro
// bundler comes from this comment:
//
// https://github.com/facebook/metro/issues/1#issuecomment-501143843
//
// Perhaps also investigate this technique as it's specifically for Lerna:
//
// https://github.com/facebook/metro/issues/1#issuecomment-511228599

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const localPackages = {
	'@joplin/lib': path.resolve(__dirname, '../lib/'),
	'@joplin/renderer': path.resolve(__dirname, '../renderer/'),
	'@joplin/turndown': path.resolve(__dirname, '../turndown/'),
	'@joplin/turndown-plugin-gfm': path.resolve(__dirname, '../turndown-plugin-gfm/'),
	'@joplin/editor': path.resolve(__dirname, '../editor/'),
	'@joplin/tools': path.resolve(__dirname, '../tools/'),
	'@joplin/utils': path.resolve(__dirname, '../utils/'),
	'@joplin/fork-htmlparser2': path.resolve(__dirname, '../fork-htmlparser2/'),
	'@joplin/fork-uslug': path.resolve(__dirname, '../fork-uslug/'),
	'@joplin/react-native-saf-x': path.resolve(__dirname, '../react-native-saf-x/'),
	'@joplin/react-native-alarm-notification': path.resolve(__dirname, '../react-native-alarm-notification/'),
	'@joplin/fork-sax': path.resolve(__dirname, '../fork-sax/'),
};

const remappedPackages = {
	...localPackages,
};

// cSpell:disable
// Some packages aren't available in react-native and thus must be polyfilled
// For example, this allows us to `import {resolve} from 'path'` rather than
// `const { resolve } = require('path-browserify')` ('path-browerify' doesn't have its own type
// definitions).
// cSpell:enable
const polyfilledPackages = ['path'];
for (const package of polyfilledPackages) {
	remappedPackages[package] = path.resolve(__dirname, `./node_modules/${package}-browserify/`);
}

const watchedFolders = [];
for (const [, v] of Object.entries(localPackages)) {
	watchedFolders.push(v);
}

const defaultConfig = getDefaultConfig(__dirname);

// Metro configuration
// https://facebook.github.io/metro/docs/configuration
//
// @type {import('metro-config').MetroConfig}
const config = {
	transformer: {
		getTransformOptions: async () => ({
			transform: {
				experimentalImportSupport: false,
				inlineRequires: true,
			},
		}),
	},
	resolver: {
		assetExts: [
			...defaultConfig.resolver.assetExts,

			// Allow loading .jpl plugin files
			'jpl',
		],

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
			remappedPackages,
			{
				get: (target, name) => {
					if (target.hasOwnProperty(name)) {
						return target[name];
					}
					return path.join(process.cwd(), `node_modules/${name}`);
				},
			},
		),
	},
	projectRoot: path.resolve(__dirname),
	watchFolders: watchedFolders,
};

module.exports = mergeConfig(defaultConfig, config);
