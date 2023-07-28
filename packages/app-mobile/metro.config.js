// Metro configuration for React Native
// https://github.com/facebook/react-native

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
	'@joplin/utils': path.resolve(__dirname, '../utils/'),
	'@joplin/fork-htmlparser2': path.resolve(__dirname, '../fork-htmlparser2/'),
	'@joplin/fork-uslug': path.resolve(__dirname, '../fork-uslug/'),
	'@joplin/react-native-saf-x': path.resolve(__dirname, '../react-native-saf-x/'),
	'@joplin/react-native-alarm-notification': path.resolve(__dirname, '../react-native-alarm-notification/'),
	'@joplin/fork-sax': path.resolve(__dirname, '../fork-sax/'),
	'@joplin/turndown': path.resolve(__dirname, '../turndown/'),
	'@joplin/turndown-plugin-gfm': path.resolve(__dirname, '../turndown-plugin-gfm/'),
};

const remappedPackages = {
	...localPackages,
};

// Some packages aren't available in react-native and thus must be replaced by browserified
// versions. For example, this allows us to `import {resolve} from 'path'` rather than
// `const { resolve } = require('path-browserify')` ('path-browerify' doesn't have its own type
// definitions).
const browserifiedPackages = ['path'];
for (const package of browserifiedPackages) {
	remappedPackages[package] = path.resolve(__dirname, `./node_modules/${package}-browserify/`);
}

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
			remappedPackages,
			{
				get: (target, name) => {
					if (target.hasOwnProperty(name)) {
						return target[name];
					}
					return path.join(process.cwd(), `node_modules/${name}`);
				},
			}
		),

		// Documentation at https://facebook.github.io/metro/docs/configuration/
		resolveRequest: (context, moduleName, platform) => {
			// console.info('Module: ' + moduleName + ' / ' + context.originModulePath);

			// This can be used to allow importing a module that requires `fs`
			// somewhere. For example, the `css` package which is used to parse
			// CSS strings has a `loadFile()` function that we don't need, but
			// that makes it import the `fs` package.
			//
			// So by having this here, we can use those packages as long as we
			// don't use the specific methods that require `fs`. It's something
			// to keep in mind if we get weird-related fs errors - it may be
			// because the package is trying to access the mocked `fs` package.
			if (moduleName === 'fs') {
				return {
					filePath: path.resolve(__dirname, 'mock-fs.js'),
					type: 'sourceFile',
				};
			}

			// Default resolver
			return context.resolveRequest(context, moduleName, platform);
		},
	},
	projectRoot: path.resolve(__dirname),
	watchFolders: watchedFolders,
};
