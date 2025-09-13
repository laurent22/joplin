import { useMemo, useRef, useState, useCallback } from 'react';

interface Props {
	width: number;
	height: number;
	emoji: string;
}

const fontSizeCache_: Record<string, number> = {};

export default (props: Props) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerReady, setContainerReady] = useState(false);

	const refCallback = useCallback((el: HTMLDivElement | null) => {
		if (el && !containerRef.current) {
			containerRef.current = el;
			requestAnimationFrame(() => {
				setContainerReady(true);
			});
		}
	}, []);

	const fontSize = useMemo(() => {
		if (!containerReady || !containerRef.current) {
			return Math.min(props.height * 0.7, 14);
		}

		const cacheKey = [props.width, props.height, props.emoji].join('-');
		if (fontSizeCache_[cacheKey]) {
			return fontSizeCache_[cacheKey];
		}

		let spanFontSize = props.height;

		const span = document.createElement('span');
		span.innerText = props.emoji;
		span.style.fontSize = `${spanFontSize}px`;
		span.style.visibility = 'hidden';
		span.style.position = 'absolute';
		span.style.whiteSpace = 'nowrap';
		containerRef.current.appendChild(span);

		let rect = span.getBoundingClientRect();
		while ((rect.height > props.height || rect.width > props.width) && spanFontSize > 1) {
			spanFontSize -= 0.5;
			span.style.fontSize = `${spanFontSize}px`;
			rect = span.getBoundingClientRect();
		}

		span.remove();
		fontSizeCache_[cacheKey] = spanFontSize;
		return spanFontSize;
	}, [props.width, props.height, props.emoji, containerReady]);

	return <div
		ref={refCallback}
		style={{
			width: props.width,
			height: props.height,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
			fontSize,
		}}
	>
		{props.emoji}
	</div>;
};
