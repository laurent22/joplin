import jest_base_setup_159 from '../../jest.base-setup.js';
import setUpLogger from './testing/setUpLogger';
import './polyfills.js';
jest_base_setup_159();

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

// By default, jsdom's window.scrollTo throws an unimplemented error
window.scrollTo = (scrollX, scrollY) => {
	if (typeof scrollX === 'object') {
		const options = scrollX;
		scrollX = options.left ?? 0;
		scrollY = options.top ?? 0;
	}

	const target = document.scrollingElement ?? document.body;
	target.scrollTop = scrollY;
	target.scrollLeft = scrollX;
};
