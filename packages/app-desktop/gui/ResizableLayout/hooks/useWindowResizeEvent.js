'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
const debounce = require('debounce');
function useWindowResizeEvent(eventEmitter) {
	react_1.useEffect(() => {
		const window_resize = debounce(() => {
			eventEmitter.current.emit('resize');
		}, 500);
		window.addEventListener('resize', window_resize);
		return () => {
			window_resize.clear();
			window.removeEventListener('resize', window_resize);
		};
	}, []);
}
exports.default = useWindowResizeEvent;
// # sourceMappingURL=useWindowResizeEvent.js.map
