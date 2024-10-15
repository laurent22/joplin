// web/webpack.config.js
// Based on https://necolas.github.io/react-native-web/docs/multi-platform/
// See also https://dev.to/mikehamilton00/adding-web-support-to-a-react-native-project-in-2023-4m4l

const path = require('path');
const appDirectory = path.resolve(__dirname, '../');
const babelConfig = require('../babel.config');

const babelLoaderConfiguration = {
	test: /\.(tsx|jsx|ts|js|mjs)$/,
	exclude: [
		path.resolve(appDirectory, 'ios'),
		path.resolve(appDirectory, 'android'),

		// Compiling these libraries with babel cause build errors.
		/.*node_modules[/\\]@babel.*/,
		/.*node_modules[/\\]@sqlite\.org[/\\].*/,
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

const resourceLoaderConfiguration = {
	test: /\.(gif|jpe?g|png|svg|ttf)$/,
	type: 'asset/resource',
};

const emptyLibraryMock = path.resolve(__dirname, 'mocks/empty.js');

module.exports = {
	target: 'web',

	entry: {
		app: path.resolve(appDirectory, 'index.web.ts'),
		serviceWorker: path.resolve(appDirectory, 'web/serviceWorker.ts'),
	},

	output: {
		filename: '[name].bundle.js',
		path: path.resolve(appDirectory, 'web/dist'),
	},

	module: {
		rules: [
			babelLoaderConfiguration,
			resourceLoaderConfiguration,
		],
	},

	resolve: {
		alias: {
			'react-native$': 'react-native-web',
			'crypto': path.resolve(__dirname, 'mocks/nodeCrypto.js'),

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

			// Workaround for applying serviceworker types to a single file.
			// See https://joshuatz.com/posts/2021/strongly-typed-service-workers/.
			// See https://github.com/microsoft/TypeScript/issues/37053
			'serviceworker': emptyLibraryMock,
		},
		// Prefers .web.js, .web.ts, etc. imports to other imports.
		extensions: [
			'.web.js',
			'.js',
			'.web.ts',
			'.ts',
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
		port: 8088,
	},
};
