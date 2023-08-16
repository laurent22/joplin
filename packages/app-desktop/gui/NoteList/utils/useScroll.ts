import * as React from 'react';
import shim from '@joplin/lib/shim';
import { Size } from '@joplin/utils/types';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';

const useScroll = (noteCount: number, itemSize: Size, listSize: Size, listRef: React.MutableRefObject<HTMLDivElement>) => {
	const [scrollTop, setScrollTop] = useState(0);
	const lastScrollSetTime = useRef(0);

	const maxScrollTop = useMemo(() => {
		return Math.max(0, itemSize.height * noteCount - listSize.height);
	}, [itemSize.height, noteCount, listSize.height]);

	// This ugly hack is necessary because setting scrollTop at a high
	// frequency, while scrolling with the keyboard, is unreliable - the
	// property will appear to be set (reading it back gives the correct value),
	// but the scrollbar will not be at the expected position. That can be
	// verified by moving the scrollbar a little and reading the event value -
	// it will be different from what was set, and what was read.
	//
	// As a result, since we can't rely on setting or reading that value (to
	// check if it's correct), we forcefully set it multiple times over the next
	// few milliseconds, hoping that maybe one of these attempts will stick.
	//
	// This is most likely a race condition in either Chromimum or Electron
	// although I couldn't find an upstream issue.
	//
	// Setting the value only once after a short time, for example 10ms, helps
	// but still fails now and then. Setting it after 500ms would probably work
	// reliably but it's too slow so it makes sense to do it in an interval.

	const setScrollTopLikeYouMeanItTimer = useRef(null);
	const setScrollTopLikeYouMeanItStartTime = useRef(0);
	const setScrollTopLikeYouMeanIt = useCallback((newScrollTop: number) => {
		if (setScrollTopLikeYouMeanItTimer.current) shim.clearInterval(setScrollTopLikeYouMeanItTimer.current);
		setScrollTopLikeYouMeanItStartTime.current = Date.now();

		setScrollTopLikeYouMeanItTimer.current = shim.setInterval(() => {
			if (!listRef.current) {
				shim.clearInterval(setScrollTopLikeYouMeanItTimer.current);
				setScrollTopLikeYouMeanItTimer.current = null;
				return;
			}

			listRef.current.scrollTop = newScrollTop;
			lastScrollSetTime.current = Date.now();

			if (Date.now() - setScrollTopLikeYouMeanItStartTime.current > 500) {
				shim.clearInterval(setScrollTopLikeYouMeanItTimer.current);
				setScrollTopLikeYouMeanItTimer.current = null;
			}
		}, 10);
	}, [listRef]);

	useEffect(() => {
		if (setScrollTopLikeYouMeanItTimer.current) shim.clearInterval(setScrollTopLikeYouMeanItTimer.current);
		setScrollTopLikeYouMeanItTimer.current = null;
	}, []);

	const scrollNoteIndex = useCallback((visibleItemCount: number, keyCode: number, ctrlKey: boolean, metaKey: boolean, noteIndex: number) => {
		if (keyCode === 33) {
			// Page Up
			noteIndex -= (visibleItemCount - 1);

		} else if (keyCode === 34) {
			// Page Down
			noteIndex += (visibleItemCount - 1);

		} else if ((keyCode === 35 && ctrlKey) || (keyCode === 40 && metaKey)) {
			// CTRL+End, CMD+Down
			noteIndex = noteCount - 1;

		} else if ((keyCode === 36 && ctrlKey) || (keyCode === 38 && metaKey)) {
			// CTRL+Home, CMD+Up
			noteIndex = 0;

		} else if (keyCode === 38 && !metaKey) {
			// Up
			noteIndex -= 1;

		} else if (keyCode === 40 && !metaKey) {
			// Down
			noteIndex += 1;
		}
		if (noteIndex < 0) noteIndex = 0;
		if (noteIndex > noteCount - 1) noteIndex = noteCount - 1;
		return noteIndex;
	}, [noteCount]);

	const makeItemIndexVisible = useCallback((itemIndex: number) => {
		const topFloat = scrollTop / itemSize.height;
		const bottomFloat = (scrollTop + listSize.height - itemSize.height) / itemSize.height;
		const top = Math.min(noteCount - 1, Math.floor(topFloat) + 1);
		const bottom = Math.max(0, Math.floor(bottomFloat));

		if (itemIndex >= top && itemIndex <= bottom) return;

		let newScrollTop = 0;
		if (itemIndex < top) {
			newScrollTop = itemSize.height * itemIndex;
		} else {
			newScrollTop = itemSize.height * (itemIndex + 1) - listSize.height;
		}

		if (newScrollTop < 0) newScrollTop = 0;
		if (newScrollTop > maxScrollTop) newScrollTop = maxScrollTop;

		setScrollTop(newScrollTop);
		setScrollTopLikeYouMeanIt(newScrollTop);
	}, [noteCount, itemSize.height, scrollTop, listSize.height, maxScrollTop, setScrollTopLikeYouMeanIt]);

	const onScroll = useCallback((event: any) => {
		// Ignore the scroll event if it has just been set programmatically.
		if (Date.now() - lastScrollSetTime.current < 100) return;
		setScrollTop(event.target.scrollTop);
		lastScrollSetTime.current = Date.now();
	}, []);

	return {
		scrollTop,
		onScroll,
		scrollNoteIndex,
		makeItemIndexVisible,
	};
};

export default useScroll;
