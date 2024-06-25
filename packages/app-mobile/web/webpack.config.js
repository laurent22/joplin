// web/webpack.config.js
// TODO: Copied from https://necolas.github.io/react-native-web/docs/multi-platform/
//			 This file should be customised to only include parts we need
// See also https://dev.to/mikehamilton00/adding-web-support-to-a-react-native-project-in-2023-4m4l

const path = require('path');
const appDirectory = path.resolve(__dirname, '../');
const babelConfig = require('../babel.config');

// This is needed for webpack to compile JavaScript.
// Many OSS React Native packages are not compiled to ES5 before being
// published. If you depend on uncompiled packages they may cause webpack build
// errors. To fix this webpack can be configured to compile to the necessary
// `node_module`.
const babelLoaderConfiguration = {
	test: /\.(tsx|jsx|ts|js|mjs)$/,
	// Add every directory that needs to be compiled by Babel during the build.
	exclude: [
		path.resolve(appDirectory, 'ios'),
		path.resolve(appDirectory, 'android'),

		/.*node_modules\/@babel.*/,
		/.*node_modules\/@sqlite\.org\/.*/,
		// path.resolve(appDirectory, 'node_modules/react-native-uncompiled')
	],

	use: {
		loader: 'babel-loader',
		options: {
			cacheDirectory: true,
			presets: babelConfig.presets,
			plugins: [
				'react-native-web',
				'@babel/plugin-transform-export-namespace-from',
				...(babelConfig.plugins ?? []),
			],
		},
	},
};

// This is needed for webpack to import static images in JavaScript files.
const imageLoaderConfiguration = {
	test: /\.(gif|jpe?g|png|svg|ttf)$/,
	type: 'asset/resource',
};

const emptyLibraryMock = path.resolve(__dirname, 'mocks/empty.js');

module.exports = {
	target: 'web',

	entry: [
		// load any web API polyfills
		// path.resolve(appDirectory, 'polyfills-web.js'),
		// your web-specific entry file
		path.resolve(appDirectory, 'index.web.ts'),
	],

	// configures where the build ends up
	output: {
		filename: 'bundle.web.js',
		path: path.resolve(appDirectory, 'web/dist'),
	},

	// ...the rest of your config

	module: {
		rules: [
			babelLoaderConfiguration,
			imageLoaderConfiguration,
		],
	},

	resolve: {
		// This will only alias the exact import "react-native"
		alias: {
			'react-native$': 'react-native-web',

			// Map some modules that don't work on web to the empty dictionary.
			'react-native-fingerprint-scanner': emptyLibraryMock,
			'@joplin/react-native-saf-x': emptyLibraryMock,
			'react-native-quick-actions': emptyLibraryMock,
			'uglifycss': emptyLibraryMock,
			'react-native-share': emptyLibraryMock,
			'react-native-camera': emptyLibraryMock,
			'react-native-zip-archive': emptyLibraryMock,
			'react-native-document-picker': emptyLibraryMock,
			'react-native-exit-app': emptyLibraryMock,
		},
		// If you're working on a multi-platform React Native app, web-specific
		// module implementations should be written in files using the extension
		// `.web.js`.
		extensions: [
			'.web.ts',
			'.ts',
			'.web.js',
			'.js',
			'.web.mjs',
			'.mjs',
			'.web.tsx',
			'.tsx',
			'.web.jsx',
			'.jsx',
			'.wasm',
		],

		fallback: {
			'url': require.resolve('url/'),
			'events': require.resolve('events/'),
			'timers': require.resolve('timers-browserify'),
			'path': require.resolve('path-browserify'),
			'stream': require.resolve('stream-browserify'),
		},
	},

	devServer: {
		// Required by @sqlite.org/sqlite-wasm
		// See https://www.npmjs.com/package/@sqlite.org/sqlite-wasm#user-content-in-a-wrapped-worker-with-opfs-if-available
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
};
