// web/webpack.config.js
// Based on https://necolas.github.io/react-native-web/docs/multi-platform/
// See also https://dev.to/mikehamilton00/adding-web-support-to-a-react-native-project-in-2023-4m4l

import * as path from 'path';
import * as webpack from 'webpack';
import 'webpack-dev-server';
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const appDirectory = path.resolve(__dirname, '../');
const babelConfig = require('../babel.config');

const buildSharedConfig = (hotReload: boolean): webpack.Configuration => {
	const babelLoaderConfiguration = {
		test: /\.(tsx|jsx|ts|js|mjs)$/,
		exclude: [
			path.resolve(appDirectory, 'ios'),
			path.resolve(appDirectory, 'android'),

			// Compiling these libraries with babel cause build errors.
			/.*node_modules[/\\]@babel.*/,
			/.*node_modules[/\\]@sqlite\.org[/\\].*/,
			/.*node_modules[/\\]markdown-it-anchor[/\\].*/,
			/.*node_modules[/\\]markdown-it-toc-done-right[/\\].*/,
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
					...(hotReload ? ['react-refresh/babel'] : []),
				],
			},
		},
	};

	const resourceLoaderConfiguration = {
		test: /\.(gif|jpe?g|png|svg|ttf)$/,
		type: 'asset/resource',
	};

	const emptyLibraryMock = path.resolve(__dirname, 'mocks/empty.js');

	return {
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

		plugins: hotReload ? [
			new ReactRefreshWebpackPlugin(),
		] : [],

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
				'@react-native-documents/picker': emptyLibraryMock,
				'react-native-exit-app': emptyLibraryMock,
				'expo-camera': emptyLibraryMock,

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
				'crypto': require.resolve('crypto-browserify'),
			},
		},
	};
};

export default (env: Record<string, boolean>) => {
	const hotReload = !!env.HOT_RELOAD;
	const appConfig: webpack.Configuration = {
		target: 'web',

		entry: {
			app: path.resolve(appDirectory, 'index.web.ts'),
		},

		...buildSharedConfig(hotReload),

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

	const serviceWorkerConfig: webpack.Configuration = {
		target: 'webworker',
		entry: {
			serviceWorker: path.resolve(appDirectory, 'web/serviceWorker.ts'),
		},
		...buildSharedConfig(false),
	};

	return [serviceWorkerConfig, appConfig];
};
