import { useEffect } from 'react';
import Setting from '@joplin/lib/models/Setting';

const useCtrlWheelZoom = () => {
	useEffect(() => {
		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				Setting.incValue('windowContentZoomFactor', e.deltaY < 0 ? 10 : -10);
			}
		};
		document.addEventListener('wheel', handleWheel, { passive: false });
		return () => document.removeEventListener('wheel', handleWheel);
	}, []);
};

export default useCtrlWheelZoom;
