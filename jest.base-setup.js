/* eslint-disable jest/require-top-level-describe */

module.exports = () => {
	// Disable the additional information that Jest adds to each console
	// statement. It's rarely needed and if it is it can be commented out here.

	const jestConsole = console;

	beforeEach(() => {
		global.console = require('console');
	});

	afterEach(() => {
		global.console = jestConsole;
	});
};

// jsdom extensions
if (typeof document !== 'undefined') {
	// Prevents the CodeMirror error "getClientRects is undefined".
	// See https://github.com/jsdom/jsdom/issues/3002#issue-652790925
	document.createRange = () => {
		const range = new Range();
		range.getBoundingClientRect = jest.fn();
		range.getClientRects = () => {
			return {
				length: 0,
				item: () => null,
				[Symbol.iterator]: jest.fn(),
			};
		};

		return range;
	};
}
if (typeof window !== 'undefined') {
	const { Buffer, Blob, File } = require('node:buffer');
	const { TextDecoder, TextEncoder } = require('node:util');
	const { URLSearchParams, URL } = require('node:url');
	const { ReadableStream } = require('node:stream/web');
	const { MessageChannel, MessagePort } = require('node:worker_threads');
	const { setTimeout, setInterval, clearTimeout, clearInterval, setImmediate, clearImmediate } = require('node:timers');
	const { performance } = require('node:perf_hooks');

	window.performance.markResourceTiming = performance.markResourceTiming;

	// Override some of the JSDom globals. Some libraries (e.g. Undici) require the
	// original Node.js versions of these globals:
	globalThis.Buffer = Buffer;
	globalThis.Blob = Blob;
	globalThis.File = File;
	globalThis.URLSearchParams = URLSearchParams;
	globalThis.URL = URL;
	globalThis.TextDecoder = TextDecoder;
	globalThis.TextEncoder = TextEncoder;
	globalThis.ReadableStream = ReadableStream;
	globalThis.MessageChannel = MessageChannel;
	globalThis.MessagePort = MessagePort;
	globalThis.setTimeout = setTimeout;
	globalThis.setInterval = setInterval;
	globalThis.clearTimeout = clearTimeout;
	globalThis.clearInterval = clearInterval;
	globalThis.setImmediate = setImmediate;
	globalThis.clearImmediate = clearImmediate;
}
