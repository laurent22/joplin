import { Size } from '@joplin/utils/types';
import { useMemo } from 'react';
import { ItemFlow } from './types';

const useVisibleRange = (scrollTop: number, listSize: Size, itemSize: Size, noteCount: number, flow: ItemFlow) => {
	const itemsPerLine = useMemo(() => {
		if (flow === ItemFlow.TopToBottom) {
			return 1;
		} else {
			return Math.floor(listSize.width / itemSize.width);
		}
	}, [flow, listSize.width, itemSize.width]);

	const startLineIndexFloat = useMemo(() => {
		return scrollTop / itemSize.height;
	}, [scrollTop, itemSize.height]);

	const endLineIndexFloat = useMemo(() => {
		return startLineIndexFloat + (listSize.height / itemSize.height);
	}, [startLineIndexFloat, listSize.height, itemSize.height]);

	const startLineIndex = useMemo(() => {
		return Math.floor(startLineIndexFloat);
	}, [startLineIndexFloat]);

	const endLineIndex = useMemo(() => {
		return Math.floor(endLineIndexFloat);
	}, [endLineIndexFloat]);

	const visibleLineCount = useMemo(() => {
		return endLineIndex - startLineIndex + 1;
	}, [endLineIndex, startLineIndex]);

	const visibleItemCount = useMemo(() => {
		return visibleLineCount * itemsPerLine;
	}, [visibleLineCount, itemsPerLine]);

	const startNoteIndex = useMemo(() => {
		return itemsPerLine * startLineIndex;
	}, [itemsPerLine, startLineIndex]);

	const endNoteIndex = useMemo(() => {
		let output = (endLineIndex + 1) * itemsPerLine - 1;
		if (output >= noteCount) output = noteCount - 1;
		return output;
	}, [endLineIndex, itemsPerLine, noteCount]);

	const totalLineCount = useMemo(() => {
		return Math.ceil(noteCount / itemsPerLine);
	}, [noteCount, itemsPerLine]);

	// console.info('itemsPerLine', itemsPerLine);
	// console.info('startLineIndexFloat', startLineIndexFloat);
	// console.info('endLineIndexFloat', endLineIndexFloat);
	// console.info('visibleLineCount', visibleLineCount);
	// console.info('startNoteIndex', startNoteIndex);
	// console.info('endNoteIndex', endNoteIndex);
	// console.info('startLineIndex', startLineIndex);
	// console.info('endLineIndex', endLineIndex);
	// console.info('totalLineCount', totalLineCount);
	// console.info('visibleItemCount', visibleItemCount);

	return [itemsPerLine, startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount];
};

export default useVisibleRange;
