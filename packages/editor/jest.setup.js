
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

// We use DataTransfer and ClipboardEvent to mock paste events.
// They don't seem to be supported by jsdom, so we mock them here:
window.DataTransfer ??= class {
	#data = new Map();
	files = [];

	setData(format, data) {
		this.#data.set(format, data);
	}

	getData(format, data) {
		return this.#data.get(format, data);
	}

	clearData(format) {
		this.#data.delete(format);
	}
};

window.ClipboardEvent ??= class extends Event {
	constructor(type, init) {
		super(type, init);
		this.clipboardData = init.clipboardData ?? null;
	}
};
