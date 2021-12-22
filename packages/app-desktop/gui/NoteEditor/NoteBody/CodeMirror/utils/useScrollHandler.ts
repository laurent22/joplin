import { useCallback, useRef } from 'react';
import shim from '@joplin/lib/shim';

export default function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function) {
	const scrollTimeoutId_ = useRef<any>(null);
	const scrollPercent_ = useRef(0);
	const ignoreNextEditorScrollTime_ = useRef(Date.now());
	const ignoreNextEditorScrollEventCount_ = useRef(0);
	const delayedSetEditorPercentScrollTimeoutID_ = useRef(null);

	// Ignores one next scroll event for a short time.
	const ignoreNextEditorScrollEvent = () => {
		const now = Date.now();
		if (now >= ignoreNextEditorScrollTime_.current) ignoreNextEditorScrollEventCount_.current = 0;
		if (ignoreNextEditorScrollEventCount_.current < 10) { // for safety
			ignoreNextEditorScrollTime_.current = now + 200;
			ignoreNextEditorScrollEventCount_.current += 1;
		}
	};

	// Tests the next scroll event should be ignored and then decrements the count.
	const isNextEditorScrollEventIgnored = () => {
		if (ignoreNextEditorScrollEventCount_.current) {
			if (Date.now() < ignoreNextEditorScrollTime_.current) {
				ignoreNextEditorScrollEventCount_.current -= 1;
				return true;
			}
			ignoreNextEditorScrollEventCount_.current = 0;
		}
		return false;
	};

	const scheduleOnScroll = useCallback((event: any) => {
		if (scrollTimeoutId_.current) {
			shim.clearTimeout(scrollTimeoutId_.current);
			scrollTimeoutId_.current = null;
		}

		scrollTimeoutId_.current = shim.setTimeout(() => {
			scrollTimeoutId_.current = null;
			onScroll(event);
		}, 10);
	}, [onScroll]);

	const setEditorPercentScrollInternal = (percent: number) => {
		scrollPercent_.current = percent;
		let retry = 0;
		const fn = () => {
			if (delayedSetEditorPercentScrollTimeoutID_.current) {
				shim.clearInterval(delayedSetEditorPercentScrollTimeoutID_.current);
				delayedSetEditorPercentScrollTimeoutID_.current = null;
			}
			const cm = editorRef.current;
			if (isCodeMirrorReady(cm)) {
				// calculates editor's GUI-dependent pixel-based raw percent
				const newEditorPercent = translateScrollPercentL2E(cm, scrollPercent_.current);
				const oldEditorPercent = cm.getScrollPercent();
				if (!(Math.abs(newEditorPercent - oldEditorPercent) < 1e-8)) {
					ignoreNextEditorScrollEvent();
					cm.setScrollPercent(newEditorPercent);
				}
			} else {
				retry += 1;
				if (retry <= 10) {
					delayedSetEditorPercentScrollTimeoutID_.current = shim.setTimeout(fn, 50);
				}
			}
		};
		fn();
	};

	const restoreEditorPercentScroll = () => {
		if (isCodeMirrorReady(editorRef.current)) {
			setEditorPercentScrollInternal(scrollPercent_.current);
		}
	};

	const setEditorPercentScroll = useCallback((percent: number) => {
		setEditorPercentScrollInternal(percent);
		if (editorRef.current) {
			scheduleOnScroll({ percent });
		}
	}, [scheduleOnScroll]);

	const setViewerPercentScroll = useCallback((percent: number) => {
		if (webviewRef.current) {
			webviewRef.current.wrappedInstance.send('setPercentScroll', percent);
			scheduleOnScroll({ percent });
		}
	}, [scheduleOnScroll]);

	const editor_scroll = useCallback(() => {
		if (isNextEditorScrollEventIgnored()) return;

		const cm = editorRef.current;
		if (isCodeMirrorReady(cm)) {
			const editorPercent = Math.max(0, Math.min(1, cm.getScrollPercent()));
			if (!isNaN(editorPercent)) {
				// when switching to another note, the percent can sometimes be NaN
				// this is coming from `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollUtils.ts`
				// when CodeMirror returns scroll info with heigth == clientHeigth
				// https://github.com/laurent22/joplin/issues/4797

				// calculates GUI-independent line-based percent
				const percent = translateScrollPercentE2L(cm, editorPercent);
				scrollPercent_.current = percent;
				setViewerPercentScroll(percent);
			}
		}
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		scrollPercent_.current = 0;
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
		}
	}, []);

	const editor_resize = useCallback((cm) => {
		if (cm) {
			restoreEditorPercentScroll();
		}
	}, []);

	return {
		resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll, editor_resize,
	};
}

const translateLE_ = (codeMirror: any, percent: number, l2e: boolean) => {
	// If the input is out of (0,1) or not number, it is not translated.
	if (!(0 < percent && percent < 1)) return percent;
	if (!codeMirror) return percent; // No translation
	const info = codeMirror.getScrollInfo();
	const height = info.height - info.clientHeight;
	if (height <= 1) return percent; // No translation for non-displayed CodeMirror.
	const lineCount = codeMirror.lineCount();
	let lineU = l2e ? Math.floor(percent * lineCount) : codeMirror.lineAtHeight(percent * height, 'local');
	lineU = Math.max(0, Math.min(lineCount - 1, lineU));
	const ePercentU = codeMirror.heightAtLine(lineU, 'local') / height;
	const ePercentL = codeMirror.heightAtLine(lineU + 1, 'local') / height;
	let linInterp, result;
	if (l2e) {
		linInterp = percent * lineCount - lineU;
		result = ePercentU + (ePercentL - ePercentU) * linInterp;
	} else {
		linInterp = Math.max(0, Math.min(1, (percent - ePercentU) / (ePercentL - ePercentU))) || 0;
		result = (lineU + linInterp) / lineCount;
	}
	return Math.max(0, Math.min(1, result));
};

// translateScrollPercentL2E() and translateScrollPercentE2L() are
// the translation functions between Editor's scroll percent and line-based scroll
// percent. They are used for synchronous scrolling between Editor and Viewer.
// To see the detail of synchronous scrolling, refer the following design document.
// https://github.com/laurent22/joplin/pull/5826#issuecomment-986032165
const translateScrollPercentL2E = (cm: any, lPercent: number) => {
	return translateLE_(cm, lPercent, true);
};

const translateScrollPercentE2L = (cm: any, ePercent: number) => {
	return translateLE_(cm, ePercent, false);
};

function isCodeMirrorReady(cm: any) {
	const info = cm?.getScrollInfo();
	return info && info.height - info.clientHeight > 0;
}
