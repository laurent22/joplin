import { useEffect } from 'react';
const debounce = require('debounce');

export default function useWindowResizeEvent(eventEmitter: any) {
	useEffect(() => {
		const window_resize = debounce(() => {
			eventEmitter.current.emit('resize');
		}, 500);

		window.addEventListener('resize', window_resize);

		return () => {
			window_resize.clear();
			window.removeEventListener('resize', window_resize);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);
}
