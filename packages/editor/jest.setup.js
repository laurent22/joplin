require('../../jest.base-setup.js')();
require('./polyfills.js');

const setUpLogger = require('./testing/setUpLogger').default;
setUpLogger();

// JSDOM overrides (don't include in polyfills.js):

// Override .createRange. By default, document.createRange creates
// a Range object with an undefined `prototype` and a `getBoundingClientRect`
// that returns `undefined`. ProseMirror relies on ranges having a working
// `getBoundingClientRect` method, so we override it:
const originalCreateRange = document.createRange;
document.createRange = () => {
	const result = originalCreateRange();
	result.getBoundingClientRect = () => ({
		width: 1,
		height: 2,
		left: 3,
		top: 4,
		bottom: 5,
		right: 6,
		x: 3,
		y: 4,
	});
	return result;
};
