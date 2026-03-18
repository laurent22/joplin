import { useEffect } from 'react';
import Setting from '@joplin/lib/models/Setting';

const useCtrlWheelZoom = () => {
	useEffect(() => {
		// Track whether modifier keys are actually pressed via keyboard events.
		// This is needed because on macOS, trackpad pinch-to-zoom gestures are
		// reported as wheel events with ctrlKey=true, even though Ctrl isn't pressed.
		let ctrlPressed = false;
		let metaPressed = false;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Control') ctrlPressed = true;
			if (e.key === 'Meta') metaPressed = true;
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Control') ctrlPressed = false;
			if (e.key === 'Meta') metaPressed = false;
		};

		const handleBlur = () => {
			ctrlPressed = false;
			metaPressed = false;
		};

		const handleWheel = (e: WheelEvent) => {
			if (ctrlPressed || metaPressed) {
				e.preventDefault();
				Setting.incValue('windowContentZoomFactor', e.deltaY < 0 ? 10 : -10);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);
		window.addEventListener('blur', handleBlur);
		document.addEventListener('wheel', handleWheel, { passive: false });

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', handleBlur);
			document.removeEventListener('wheel', handleWheel);
		};
	}, []);
};

export default useCtrlWheelZoom;
