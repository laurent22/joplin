import { useEffect, useState } from 'react';

interface Size {
	width: number;
	height: number;
	hash: string;
}

export default function(frameWindow: any, htmlHash: string, minWidth: number, minHeight: number, fitToContent: boolean, isReady: boolean) {
	const [contentSize, setContentSize] = useState<Size>({
		width: minWidth,
		height: minHeight,
		hash: '',
	});

	function updateContentSize(hash: string) {
		if (!frameWindow) return;

		const rect = frameWindow.document.getElementById('joplin-plugin-content').getBoundingClientRect();

		let w = rect.width;
		let h = rect.height;
		if (w < minWidth) w = minWidth;
		if (h < minHeight) h = minHeight;

		const newSize = { width: w, height: h, hash: hash };

		setContentSize((current: Size) => {
			if (current.width === newSize.width && current.height === newSize.height && current.hash === hash) return current;
			return newSize;
		});
	}

	useEffect(() => {
		updateContentSize(htmlHash);
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [htmlHash]);

	useEffect(() => {
		if (!fitToContent || !isReady) return () => {};

		function onTick() {
			updateContentSize(htmlHash);
		}

		// The only reliable way to make sure that the iframe has the same dimensions
		// as its content is to poll the dimensions at regular intervals. Other methods
		// work most of the time but will fail in various edge cases. Most reliable way
		// is probably iframe-resizer package, but still with 40 unfixed bugs.
		//
		// Polling in our case is fine since this is only used when displaying plugin
		// dialogs, which should be short lived. updateContentSize() is also optimised
		// to do nothing when size hasn't changed.
		const updateFrameSizeIID = setInterval(onTick, 100);

		return () => {
			clearInterval(updateFrameSizeIID);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [fitToContent, isReady, minWidth, minHeight, htmlHash]);

	return contentSize;
}
