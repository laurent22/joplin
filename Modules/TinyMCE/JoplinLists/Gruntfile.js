const { CheckerPlugin } = require('awesome-typescript-loader');
const LiveReloadPlugin = require('webpack-livereload-plugin');
const path = require('path');
const swag = require('@ephox/swag');

module.exports = function(grunt) {
	const packageData = grunt.file.readJSON('package.json');
	const BUILD_VERSION = `${packageData.version}-${process.env.BUILD_NUMBER ? process.env.BUILD_NUMBER : '0'}`;
	const libPluginPath = 'lib/Main.js';
	const scratchPluginPath = 'scratch/compiled/joplinLists.js';
	const scratchPluginMinPath = 'scratch/compiled/joplinLists.min.js';
	const tsDemoSourceFile = path.resolve('src/demo/ts/Demo.ts');
	const jsDemoDestFile = path.resolve('scratch/compiled/demo.js');

	grunt.initConfig({
		pkg: packageData,

		clean: {
			dirs: ['dist', 'scratch'],
		},

		// tslint: {
		//   options: {
		//     configuration: 'tslint.json'
		//   },
		//   plugin: ['src/**/*.ts']
		// },

		shell: {
			command: 'tsc',
		},

		rollup: {
			options: {
				treeshake: true,
				external: [
					'tinymce/core/api/PluginManager',
					'tinymce/core/api/util/Tools',
					'tinymce/core/api/dom/BookmarkManager',
					'tinymce/core/api/Editor',
					'tinymce/core/api/dom/DOMUtils',
					'tinymce/core/api/dom/RangeUtils',
					'tinymce/core/api/dom/TreeWalker',
					'tinymce/core/api/util/VK',
					'tinymce/core/api/dom/DomQuery',
				],
    			globals: {
        			'tinymce/core/api/PluginManager': 'tinymce.PluginManager',
					'tinymce/core/api/util/Tools': 'tinymce.util.Tools',
					'tinymce/core/api/dom/BookmarkManager': 'tinymce.dom.BookmarkManager',
					'tinymce/core/api/Editor': 'tinymce.Editor',
					'tinymce/core/api/dom/DOMUtils': 'tinymce.dom.DOMUtils',
					'tinymce/core/api/dom/RangeUtils': 'tinymce.dom.RangeUtils',
					'tinymce/core/api/dom/TreeWalker': 'tinymce.dom.TreeWalker',
					'tinymce/core/api/util/VK': 'tinymce.util.VK',
					'tinymce/core/api/dom/DomQuery': 'tinymce.dom.DomQuery',
				},
				format: 'iife',
				onwarn: swag.onwarn,
				plugins: [
					swag.nodeResolve({
						basedir: __dirname,
						prefixes: {},
					}),
					swag.remapImports(),
				],
			},
			plugin: {
				files: [
					{
						src: libPluginPath,
						dest: scratchPluginPath,
					},
				],
			},
		},

		uglify: {
			plugin: {
				files: [
					{
						src: scratchPluginPath,
						dest: scratchPluginMinPath,
					},
				],
			},
		},

		concat: {
			license: {
				options: {
					process: function(src) {
						const buildSuffix = process.env.BUILD_NUMBER
							? `-${process.env.BUILD_NUMBER}`
							: '';
						return src.replace(
							/@BUILD_NUMBER@/g,
							packageData.version + buildSuffix
						);
					},
				},
				// scratchPluginMinPath is used twice on purpose, all outputs will be minified for premium plugins
				files: {
					'dist/joplinLists.js': [
						'src/text/license-header.js',
						scratchPluginPath,
					],
					'dist/joplinLists.min.js': [
						'src/text/license-header.js',
						scratchPluginMinPath,
					],
				},
			},
		},

		copy: {
			css: {
				files: [
					// {
					// 	cwd: 'src/text',
					// 	src: ['license.txt'],
					// 	dest: 'dist',
					// 	expand: true,
					// },
					// { src: ['changelog.txt'], dest: 'dist', expand: true },
					{
						src: ['dist/joplinLists.js'],
						dest: '../../../ElectronClient/gui/editors/TinyMCE/plugins/lists.js',
					},
				],
			},
		},

		webpack: {
			options: {
				mode: 'development',
				watch: true,
			},
			dev: {
				entry: tsDemoSourceFile,
				devtool: 'source-map',

				resolve: {
					extensions: ['.ts', '.js'],
				},

				module: {
					rules: [
						{
							test: /\.js$/,
							use: ['source-map-loader'],
							enforce: 'pre',
						},
						{
							test: /\.ts$/,
							use: [
								{
									loader: 'ts-loader',
									options: {
										transpileOnly: true,
										experimentalWatchApi: true,
									},
								},
							],
						},
					],
				},

				plugins: [new LiveReloadPlugin(), new CheckerPlugin()],

				output: {
					filename: path.basename(jsDemoDestFile),
					path: path.dirname(jsDemoDestFile),
				},
			},
		},
	});

	require('load-grunt-tasks')(grunt);
	grunt.loadNpmTasks('@ephox/swag');

	// grunt.registerTask('version', 'Creates a version file', function() {
	// 	grunt.file.write('dist/version.txt', BUILD_VERSION);
	// });

	grunt.registerTask('default', [
		'clean',
		// 'tslint',
		'shell',
		'rollup',
		'uglify',
		'concat',
		'copy',
		// 'version',
	]);
};
