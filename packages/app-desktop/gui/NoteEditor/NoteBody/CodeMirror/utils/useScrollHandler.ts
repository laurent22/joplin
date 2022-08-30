import { useCallback, useRef } from 'react';
import shim from '@joplin/lib/shim';

export default function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function) {
	const scrollTimeoutId_ = useRef<any>(null);
	const scrollPercent_ = useRef(0);
	const ignoreNextEditorScrollTime_ = useRef(Date.now());
	const ignoreNextEditorScrollEventCount_ = useRef(0);
	const delayedSetEditorPercentScrollTimeoutID_ = useRef(null);
	const scrollTopIsUncertain_ = useRef(true);
	const lastResizeHeight_ = useRef(NaN);
	const lastLinesHeight_ = useRef(NaN);
	const restoreEditorPercentScrollTimeoutId_ = useRef<any>(null);

	// Ignores one next scroll event for a short time.
	const ignoreNextEditorScrollEvent = () => {
		const now = Date.now();
		if (now >= ignoreNextEditorScrollTime_.current) ignoreNextEditorScrollEventCount_.current = 0;
		if (ignoreNextEditorScrollEventCount_.current < 10) { // for safety
			ignoreNextEditorScrollTime_.current = now + 1000;
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
				const oldEditorPercent = scrollTopIsUncertain_.current ? NaN : cm.getScrollPercent();
				if (!(Math.abs(newEditorPercent - oldEditorPercent) < 1e-8)) {
					ignoreNextEditorScrollEvent();
					cm.setScrollPercent(newEditorPercent);
				}
				scrollTopIsUncertain_.current = false;
			} else {
				retry += 1;
				if (retry <= 3) {
					delayedSetEditorPercentScrollTimeoutID_.current = shim.setTimeout(fn, 50);
				}
				scrollTopIsUncertain_.current = true;
				lastResizeHeight_.current = NaN;
				lastLinesHeight_.current = NaN;
			}
		};
		fn();
	};

	const restoreEditorPercentScroll = () => {
		if (restoreEditorPercentScrollTimeoutId_.current) {
			shim.clearTimeout(restoreEditorPercentScrollTimeoutId_.current);
			restoreEditorPercentScrollTimeoutId_.current = null;
		}
		const cm = editorRef.current;
		if (isCodeMirrorReady(cm)) {
			lastLinesHeight_.current = cm.heightAtLine(cm.lineCount()) - cm.heightAtLine(0);
			setEditorPercentScrollInternal(scrollPercent_.current);
		}
	};

	const setEditorPercentScroll = useCallback((percent: number) => {
		setEditorPercentScrollInternal(percent);
		if (editorRef.current) {
			scheduleOnScroll({ percent });
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [scheduleOnScroll]);

	const setViewerPercentScroll = useCallback((percent: number) => {
		if (webviewRef.current) {
			webviewRef.current.wrappedInstance.send('setPercentScroll', percent);
			scheduleOnScroll({ percent });
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [scheduleOnScroll]);

	const editor_scroll = useCallback(() => {
		const ignored = isNextEditorScrollEventIgnored();
		const cm = editorRef.current;
		if (isCodeMirrorReady(cm)) {
			if (scrollTopIsUncertain_.current) return;
			const editorPercent = Math.max(0, Math.min(1, cm.getScrollPercent()));
			if (!isNaN(editorPercent)) {
				// when switching to another note, the percent can sometimes be NaN
				// this is coming from `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollUtils.ts`
				// when CodeMirror returns scroll info with heigth == clientHeigth
				// https://github.com/laurent22/joplin/issues/4797
				if (!ignored) {
					// calculates GUI-independent line-based percent
					const percent = translateScrollPercentE2L(cm, editorPercent);
					scrollPercent_.current = percent;
					setViewerPercentScroll(percent);
				}
			}
		} else {
			scrollTopIsUncertain_.current = true;
			lastResizeHeight_.current = NaN;
			lastLinesHeight_.current = NaN;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		scrollPercent_.current = 0;
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
			scrollTopIsUncertain_.current = false;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	const editor_resize = useCallback((cm) => {
		if (isCodeMirrorReady(cm)) {
			// This handler is called when resized and refreshed.
			// Only when resized, the scroll position is restored.
			const info = cm.getScrollInfo();
			const height = info.height - info.clientHeight;
			if (height !== lastResizeHeight_.current) {
				// When resized, restoring is performed immediately.
				restoreEditorPercentScroll();
				lastResizeHeight_.current = height;
			}
		} else {
			scrollTopIsUncertain_.current = true;
			lastResizeHeight_.current = NaN;
			lastLinesHeight_.current = NaN;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	// When heights of lines are updated in CodeMirror, 'update' events are raised.
	// If such an update event is raised, scroll position should be restored.
	// See https://github.com/laurent22/joplin/issues/5981
	const editor_update = useCallback((cm: any, edited: boolean) => {
		if (isCodeMirrorReady(cm)) {
			if (edited) return;
			const linesHeight = cm.heightAtLine(cm.lineCount()) - cm.heightAtLine(0);
			if (lastLinesHeight_.current !== linesHeight) {
				// To avoid cancelling intentional scroll position changes,
				// restoring is performed in a timeout handler.
				if (!restoreEditorPercentScrollTimeoutId_.current) {
					restoreEditorPercentScrollTimeoutId_.current = shim.setTimeout(restoreEditorPercentScroll, 10);
				}
			}
		} else {
			scrollTopIsUncertain_.current = true;
			lastResizeHeight_.current = NaN;
			lastLinesHeight_.current = NaN;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	const getLineScrollPercent = useCallback(() => {
		const cm = editorRef.current;
		if (isCodeMirrorReady(cm)) {
			const ePercent = cm.getScrollPercent();
			return translateScrollPercentE2L(cm, ePercent);
		} else {
			return scrollPercent_.current;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	return {
		resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll, editor_resize, editor_update, getLineScrollPercent,
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
