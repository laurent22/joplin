
//
// JSDOM and browser polyfills:
//
// If running in JSDOM, a number of visual browser APIs are missing
// or incomplete.
// This file may also be included when running in a browser. As such, the methods
// should be added only if missing.
//

const createMockRect = (): DOMRect => {
	const rect = {
		width: 1,
		height: 2,
		left: 3,
		top: 4,
		bottom: 5,
		right: 6,
		x: 3,
		y: 4,
	};

	return {
		...rect,
		toJSON: () => JSON.stringify(rect),
	};
};
HTMLElement.prototype.getBoundingClientRect ??= () => {
	return createMockRect();
};

// Prevents the CodeMirror error "getClientRects is undefined".
// See https://github.com/jsdom/jsdom/issues/3002#issue-652790925
Range.prototype.getBoundingClientRect ??= () => {
	return createMockRect();
};

Range.prototype.getClientRects ??= () => {
	return {
		length: 0,
		item: () => null,
		[Symbol.iterator]: () => null,
	};
};

