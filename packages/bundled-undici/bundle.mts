import esbuild from 'esbuild';
import { readFile, writeFile } from 'fs/promises';

const bundleUndici = async () => {
	// By default, Undici is broken in Electron renderer environments and can cause renderer process
	// crashes when fetching certain URLs.
	//
	// Undici relies on several NodeJS global objects that are replaced in the Electron renderer process.
	// For example, with the Electron globals, there's no .unref() on timer handles returned by setTimeout().
	//
	// As a workaround, add imports for many of the built-in objects so that Undici uses the NodeJS versions
	// of the built-ins:
	const outfile = 'index.bundle.js';
	const bundler = await esbuild.context({
		entryPoints: ['./index.ts'],
		outfile,
		bundle: true,
		minify: false,
		format: 'cjs',
		sourcemap: false,
		platform: 'node',
		target: ['node22.0'],
	});
	await bundler.rebuild();

	await writeFile(outfile, `
		const { Buffer, Blob, File } = require('node:buffer');
		const { TextDecoder, TextEncoder } = require('node:util');
		const { URLSearchParams, URL } = require('node:url');
		const { ReadableStream } = require('node:stream/web');
		const { MessageChannel, MessagePort } = require('node:worker_threads');
		const { setTimeout, setInterval, clearTimeout, clearInterval, setImmediate, clearImmediate } = require('node:timers');
		const { performance } = require('node:perf_hooks');

		${await readFile(outfile, 'utf-8')}
	`, 'utf-8');
	await bundler.dispose();
};

void bundleUndici();
