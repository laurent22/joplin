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
	const { TextDecoder, TextEncoder } = require('node:util');
	const { ReadableStream } = require('node:stream/web');
	const { MessageChannel, MessagePort } = require('node:worker_threads');

	// TextDecoder, TextEncoder, etc. are removed by jsdom, but required by
	// some libraries
	window.TextDecoder = TextDecoder;
	window.TextEncoder = TextEncoder;
	window.ReadableStream = ReadableStream;
	window.MessageChannel = MessageChannel;
	window.MessagePort = MessagePort;
}
