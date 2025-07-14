import { filename, toForwardSlashes } from '@joplin/utils/path';
import * as esbuild from 'esbuild';
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { dirname, join, relative } from 'path';

const baseDir = dirname(__dirname);
const baseNodeModules = join(baseDir, 'node_modules');

// Note: Roughly based on js-draw's use of esbuild:
// https://github.com/personalizedrefrigerator/js-draw/blob/6fe6d6821402a08a8d17f15a8f48d95e5d7b084f/packages/build-tool/src/BundledFile.ts#L64
const makeBuildContext = (entryPoint: string, renderer: boolean, computeFileSizeStats: boolean) => {
	return esbuild.context({
		entryPoints: [entryPoint],
		outfile: `${filename(entryPoint)}.bundle.js`,
		bundle: true,
		minify: true,
		keepNames: true, // Preserve original function names -- useful for debugging
		format: 'iife', // Immediately invoked function expression
		sourcemap: true,
		sourcesContent: false, // Do not embed full source file content in the .map file
		metafile: computeFileSizeStats,
		platform: 'node',
		target: ['node20.0'],
		mainFields: renderer ? ['browser', 'main'] : ['main'],
		plugins: [
			{
				// Configures ESBuild to require(...) certain libraries that cause issues if included directly
				// in the bundle. Some of these are transitive dependencies and so need to have relative paths
				// in the final bundle.
				name: 'joplin--relative-imports-for-externals',
				setup: build => {
					const externalRegex = /^(.*\.node|sqlite3|electron|@electron\/remote\/.*|electron\/.*|@mapbox\/node-pre-gyp|jsdom)$/;
					build.onResolve({ filter: externalRegex }, args => {
						// Electron packages don't need relative requires
						if (args.path === 'electron' || args.path.startsWith('electron/')) {
							return { path: args.path, external: true, namespace: 'node' };
						}

						// Other packages may need relative requires
						let path = toForwardSlashes(relative(
							baseDir,
							require.resolve(args.path, { paths: [baseNodeModules, args.resolveDir, baseDir] }),
						));
						if (!path.startsWith('.')) {
							path = `./${path}`;
						}

						// Some files have .node.* extensions but are not native modules. These files are often required using
						// require('./something.node') rather than require('./something.node.js'). Skip path remapping for
						// these files:
						if (args.path.endsWith('.node') && (path.endsWith('.ts') || path.endsWith('.js'))) {
							// Normal .ts or .js file -- continue.
							return null;
						}

						// Log that this is external -- it should be included in "dependencies" and not "devDependencies" in package.json:
						console.log('External path:', path, args.importer);
						return {
							path,
							external: true,
						};
					});
				},
			},
			{
				// Rewrite imports to prefer .js files to .ts. Otherwise, certain files are duplicated in the final bundle
				name: 'joplin--prefer-js-imports',
				setup: build => {
					// Rewrite all relative imports
					build.onResolve({ filter: /^\./ }, args => {
						try {
							const importPath = args.path === '.' ? './index' : args.path;
							let path = require.resolve(importPath, { paths: [args.resolveDir, baseNodeModules, baseDir] });
							// require.resolve **can** return paths with .ts extensions, presumably because
							// this build script is a .ts file.
							if (path.endsWith('.ts')) {
								const alternative = path.replace(/\.ts$/, '.js');
								if (existsSync(alternative)) {
									path = alternative;
								}
							}
							return { path };
						} catch (error) {
							return {
								errors: [{ text: `Failed to import: ${error}`, detail: error }],
							};
						}
					});
				},
			},
			{
				name: 'joplin--smaller-source-map-size',
				setup: build => {
					// Exclude dependencies from node_modules. This significantly reduces the size of the
					// source map, improving startup performance.
					//
					// See https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409
					// and https://github.com/evanw/esbuild/issues/4130
					const emptyMapData = Buffer.from(
						JSON.stringify({ version: 3, sources: [null], mappings: 'AAAA' }),
						'utf-8',
					).toString('base64');
					const emptyMapUrl = `data:application/json;base64,${emptyMapData}`;

					build.onLoad({ filter: /node_modules.*js$/ }, args => {
						return {
							contents: [
								readFileSync(args.path, 'utf8'),
								`//# sourceMappingURL=${emptyMapUrl}`,
							].join('\n'),
							loader: 'default',
						};
					});
				},
			},
		],
	});
};

const bundleJs = async (writeStats: boolean) => {
	const entryPoints = [
		{ fileName: 'main.js', renderer: false },
		{ fileName: 'main-html.js', renderer: true },
	];
	for (const { fileName, renderer } of entryPoints) {
		const compiler = await makeBuildContext(fileName, renderer, writeStats);
		const result = await compiler.rebuild();
		if (writeStats) {
			const outPath = `${dirname(__dirname)}/${fileName}.meta.json`;
			console.log('Writing bundle stats to ', outPath);
			await writeFile(outPath, JSON.stringify(result.metafile, undefined, '\t'));
		}
		await compiler.dispose();
	}
};

export default bundleJs;
