// web/webpack.config.js
// TODO: Copied from https://necolas.github.io/react-native-web/docs/multi-platform/
//			 This file should be customised to only include parts we need
// See also https://dev.to/mikehamilton00/adding-web-support-to-a-react-native-project-in-2023-4m4l

const path = require('path');
const webpack = require('webpack');

const appDirectory = path.resolve(__dirname, '../');

const babelConfig = require('../babel.config');

// This is needed for webpack to compile JavaScript.
// Many OSS React Native packages are not compiled to ES5 before being
// published. If you depend on uncompiled packages they may cause webpack build
// errors. To fix this webpack can be configured to compile to the necessary
// `node_module`.
const babelLoaderConfiguration = {
	test: /\.(tsx|jsx|ts|js)$/,
	// Add every directory that needs to be compiled by Babel during the build.
	exclude: [
		{
			and: [
				path.resolve(appDirectory, 'ios'),
				path.resolve(appDirectory, 'android'),
			],

			not: []
		}
		//path.resolve(appDirectory, 'node_modules/react-native-uncompiled')
	],

	use: {
		loader: 'babel-loader',
		options: {
			cacheDirectory: true,
			presets: babelConfig.presets,
			plugins: [
				'react-native-web',
				'@babel/plugin-transform-export-namespace-from',
				...babelConfig.plugins
			]
		}
	}
};

// This is needed for webpack to import static images in JavaScript files.
const imageLoaderConfiguration = {
	test: /\.(gif|jpe?g|png|svg)$/,
	use: {
		loader: 'url-loader',
		options: {
			name: '[name].[ext]',
			esModule: false,
		}
	}
};

module.exports = {
	mode: 'development',

	entry: [
		// load any web API polyfills
		// path.resolve(appDirectory, 'polyfills-web.js'),
		// your web-specific entry file
		path.resolve(appDirectory, 'index.web.js')
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
			imageLoaderConfiguration
		]
	},

	resolve: {
		// This will only alias the exact import "react-native"
		alias: {
			'react-native$': 'react-native-web',

			// Map some modules that don't work on web to the empty dictionary.
			'react-native-fingerprint-scanner': path.resolve(__dirname, 'mocks/empty.js'),
			'@joplin/react-native-saf-x': path.resolve(__dirname, 'mocks/empty.js'),
			'react-native-quick-actions': path.resolve(__dirname, 'mocks/empty.js'),
		},
		// If you're working on a multi-platform React Native app, web-specific
		// module implementations should be written in files using the extension
		// `.web.js`.
		extensions: [
			'.web.js',
			'.js',
			'.web.ts',
			'.ts',
			'.web.jsx',
			'.jsx',
			'.web.tsx',
			'.tsx',
		],

		fallback: {
			"url": require.resolve("url/"),
			"events": require.resolve("events/"),
			"timers": require.resolve("timers-browserify"),
			"path": require.resolve("path-browserify"),
			"stream": require.resolve("stream-browserify"),
		}
	}
}
