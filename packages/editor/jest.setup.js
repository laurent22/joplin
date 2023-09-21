
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
