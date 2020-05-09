import { useEffect, useCallback, useRef } from 'react';

interface HookDependencies {
	editor:any,
	onScroll: Function,
}

export default function useScroll(dependencies:HookDependencies) {
	const { editor, onScroll } = dependencies;
	const scrollTimeoutId_ = useRef(null);

	const maxScrollTop = useCallback(() => {
		if (!editor) return 0;

		const doc = editor.getDoc();
		const win = editor.getWin();
		if (!doc || !win) return 0;
		const firstChild = doc.firstElementChild;
		if (!firstChild) return 0;

		const winHeight = win.innerHeight;
		const contentHeight = firstChild.scrollHeight;
		return contentHeight < winHeight ? 0 : contentHeight - winHeight;
	}, [editor]);

	const scrollTop = useCallback(() => {
		if (!editor) return 0;
		const win = editor.getWin();
		if (!win) return 0;
		return win.scrollY;
	}, [editor]);

	const scrollPercent = useCallback(() => {
		const m = maxScrollTop();
		const t = scrollTop();
		return m <= 0 ? 0 : t / m;
	}, [maxScrollTop, scrollTop]);

	const scrollToPercent = useCallback((percent:number) => {
		if (!editor) return;
		editor.getWin().scrollTo(0, maxScrollTop() * percent);
	}, [editor, maxScrollTop]);

	const scheduleOnScroll = useCallback((event: any) => {
		if (scrollTimeoutId_.current) {
			clearTimeout(scrollTimeoutId_.current);
			scrollTimeoutId_.current = null;
		}

		scrollTimeoutId_.current = setTimeout(() => {
			scrollTimeoutId_.current = null;
			onScroll(event);
		}, 10);
	}, [onScroll]);

	const onEditorScroll = useCallback(() => {
		scheduleOnScroll({ percent: scrollPercent() });
	}, [scheduleOnScroll, scrollPercent]);

	useEffect(() => {
		if (!editor) return () => {};

		editor.getDoc().addEventListener('scroll', onEditorScroll);
		return () => {
			editor.getDoc().removeEventListener('scroll', onEditorScroll);
		};
	}, [editor, onEditorScroll]);

	return { scrollToPercent };
}
