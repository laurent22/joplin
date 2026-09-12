import { WheelEvent, useCallback } from 'react';

// Wheel handler for whiteboard cards. Stops propagation whenever the card
// (or something inside it) is scrollable at all — even if currently at a
// scroll boundary. Otherwise the event bubbles out and React Flow pans the
// canvas.
//
// The boundary detail matters: if we only stopped propagation when the card
// could still scroll further, scrolling past the bottom of a scrollable
// card would suddenly jump the canvas. That's disorienting. So the rule is:
// "if this card has scrollable content, wheel belongs to the card."

const isScrollable = (el: Element): boolean => {
	const style = window.getComputedStyle(el);
	if (/(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return true;
	if (/(auto|scroll|overlay)/.test(style.overflowX) && el.scrollWidth > el.clientWidth) return true;
	return false;
};

const useCardWheel = () => {
	return useCallback((event: WheelEvent<HTMLElement>) => {
		const root = event.currentTarget;
		let el: Element | null = event.target as Element;
		while (el && el !== root.parentElement) {
			if (isScrollable(el)) {
				event.stopPropagation();
				return;
			}
			el = el.parentElement;
		}
	}, []);
};

export default useCardWheel;
