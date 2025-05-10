import { RefObject, useState } from 'react';
import useMessageHandler from './useMessageHandler';

interface Size {
	width: number;
	height: number;
	hash: string;
}

export default function(viewRef: RefObject<HTMLIFrameElement>, htmlHash: string, minWidth: number, minHeight: number) {
	const [contentSize, setContentSize] = useState<Size>({
		width: minWidth,
		height: minHeight,
		hash: '',
	});

	useMessageHandler(viewRef, event => {
		if (event.data.message !== 'updateContentSize') return;
		const rect = event.data.size;

		let w = rect.width;
		let h = rect.height;
		if (w < minWidth) w = minWidth;
		if (h < minHeight) h = minHeight;

		const newSize = { width: w, height: h, hash: htmlHash };

		setContentSize((current: Size) => {
			if (current.width === newSize.width && current.height === newSize.height && current.hash === htmlHash) return current;
			return newSize;
		});
	});

	return contentSize;
}
