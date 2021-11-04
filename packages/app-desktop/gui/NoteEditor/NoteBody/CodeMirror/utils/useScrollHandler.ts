import { useCallback, useRef } from 'react';
import shim from '@joplin/lib/shim';
import { SyncScrollMap } from '../../../../utils/SyncScrollMap';

export default function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function) {
	const ignoreNextEditorScrollEvent_ = useRef(false);
	const scrollTimeoutId_ = useRef<any>(null);

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

	const setEditorPercentScroll = useCallback((p: number) => {
		ignoreNextEditorScrollEvent_.current = true;

		if (editorRef.current) {
			editorRef.current.setScrollPercent(p);

			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const setViewerPercentScroll = useCallback((p: number) => {
		if (webviewRef.current) {
			webviewRef.current.wrappedInstance.send('setPercentScroll', p);
			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const editor_scroll = useCallback(() => {
		if (ignoreNextEditorScrollEvent_.current) {
			ignoreNextEditorScrollEvent_.current = false;
			return;
		}

		if (editorRef.current) {
			const editorPercent = Math.max(0, Math.min(1, editorRef.current.getScrollPercent()));
			if (!isNaN(editorPercent)) {
				// when switching to another note, the percent can sometimes be NaN
				// this is coming from `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollUtils.ts`
				// when CodeMirror returns scroll info with heigth == clientHeigth
				// https://github.com/laurent22/joplin/issues/4797
				const viewerPercent = translateScrollPercentToViewer(editorRef, webviewRef, editorPercent);
				setViewerPercentScroll(viewerPercent);
			}
		}
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
		}
	}, []);

	return { resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll };
}

const translateScrollPercent_ = (editorRef: any, webviewRef: any, percent: number, editorToViewer: boolean) => {
	// If the input is out of (0,1) or not number, it is not translated.
	if (!(0 < percent && percent < 1)) return percent;
	const map: SyncScrollMap = webviewRef.current?.wrappedInstance.getSyncScrollMap();
	const cm = editorRef.current;
	if (!map || map.line.length <= 2 || !cm) return percent; // No translation
	const lineCount = cm.lineCount();
	if (map.line[map.line.length - 2] >= lineCount) {
		// Discarded a obsolete map and use no translation.
		webviewRef.current.wrappedInstance.refreshSyncScrollMap(false);
		return percent;
	}
	const info = cm.getScrollInfo();
	const height = Math.max(1, info.height - info.clientHeight);
	let values = map.percent, target = percent;
	if (editorToViewer) {
		const top = percent * height;
		const line = cm.lineAtHeight(top, 'local');
		values = map.line;
		target = line;
	}
	// Binary search (rightmost): finds where map[r-1][field] <= target < map[r][field]
	let l = 1, r = values.length - 1;
	while (l < r) {
		const m = Math.floor(l + (r - l) / 2);
		if (target < values[m]) r = m; else l = m + 1;
	}
	const lineU = map.line[r - 1];
	const lineL = Math.min(lineCount, map.line[r]);
	const ePercentU = r == 1 ? 0 : Math.min(1, cm.heightAtLine(lineU, 'local') / height);
	const ePercentL = Math.min(1, cm.heightAtLine(lineL, 'local') / height);
	const vPercentU = map.percent[r - 1];
	const vPercentL = ePercentL == 1 ? 1 : map.percent[r];
	let result;
	if (editorToViewer) {
		const linInterp = (percent - ePercentU) / (ePercentL - ePercentU);
		result = vPercentU + (vPercentL - vPercentU) * linInterp;
	} else {
		const linInterp = (percent - vPercentU) / (vPercentL - vPercentU);
		result = ePercentU + (ePercentL - ePercentU) * linInterp;
	}
	return Math.max(0, Math.min(1, result));
};

// translateScrollPercentToEditor() and translateScrollPercentToViewer() are
// the translation functions between Editor's scroll percent and Viewer's scroll
// percent. They are used for synchronous scrolling between Editor and Viewer.
// They use a SyncScrollMap provided by Viewer for its translation.
// To see the detail of synchronous scrolling, refer the following design document.
// https://github.com/laurent22/joplin/pull/5512#issuecomment-931277022

export const translateScrollPercentToEditor = (editorRef: any, webviewRef: any, viewerPercent: number) => {
	const editorPercent = translateScrollPercent_(editorRef, webviewRef, viewerPercent, false);
	return editorPercent;
};

export const translateScrollPercentToViewer = (editorRef: any, webviewRef: any, editorPercent: number) => {
	const viewerPercent = translateScrollPercent_(editorRef, webviewRef, editorPercent, true);
	return viewerPercent;
};
