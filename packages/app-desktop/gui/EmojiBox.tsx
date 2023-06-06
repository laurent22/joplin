import { useMemo, useRef, useState } from 'react';

interface Props {
	width: number;
	height: number;
	emoji: string;
}

const fontSizeCache_: Record<string, number> = {};

export default (props: Props) => {
	const containerRef = useRef(null);
	const [containerReady, setContainerReady] = useState(false);

	const fontSize = useMemo(() => {
		if (!containerReady) return props.height;

		const cacheKey = [props.width, props.height, props.emoji].join('-');
		if (fontSizeCache_[cacheKey]) {
			return fontSizeCache_[cacheKey];
		}

		// Set the emoji font size so that it fits within the specified width
		// and height. In fact, currently it only looks at the height.

		let spanFontSize = props.height;

		const span = document.createElement('span');
		span.innerText = props.emoji;
		span.style.fontSize = `${spanFontSize}px`;
		containerRef.current.appendChild(span);

		let rect = span.getBoundingClientRect();

		while (rect.height > props.height) {
			spanFontSize -= .5;
			span.style.fontSize = `${spanFontSize}px`;
			rect = span.getBoundingClientRect();
		}

		if (rect.height <= props.height) {
			spanFontSize = 15;
			span.style.fontSize = `${spanFontSize}px`;
			rect = span.getBoundingClientRect();
		}

		span.remove();

		fontSizeCache_[cacheKey] = spanFontSize;
		return spanFontSize;
	}, [props.width, props.height, props.emoji, containerReady, containerRef]);

	return <div className="emoji-box" ref={el => { containerRef.current = el; setContainerReady(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: props.height, fontSize }}>{props.emoji}</div>;
};
