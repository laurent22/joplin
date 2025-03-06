import { Size } from '@joplin/utils/types';
import { useMemo } from 'react';

const useVisibleRange = (itemsPerLine: number, scrollTop: number, listSize: Size, itemSize: Size, noteCount: number) => {
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

	// Note: Leave this here to test the note list scroll behaviour. Also add "item.index" to the
	// rows in defaultListRenderer to check whether the value here matches what's being displayed.
	// `useScroll` can also be changed to display the effective scroll value.

	// console.info('=======================================');
	// console.info('scrollTop', scrollTop);
	// console.info('itemsPerLine', itemsPerLine);
	// console.info('listSize.height', listSize.height);
	// console.info('itemSize.height', itemSize.height);
	// console.info('startLineIndexFloat', startLineIndexFloat);
	// console.info('endLineIndexFloat', endLineIndexFloat);
	// console.info('visibleLineCount', visibleLineCount);
	// console.info('startNoteIndex', startNoteIndex);
	// console.info('endNoteIndex', endNoteIndex);
	// console.info('startLineIndex', startLineIndex);
	// console.info('endLineIndex', endLineIndex);
	// console.info('totalLineCount', totalLineCount);
	// console.info('visibleItemCount', visibleItemCount);
	// console.info('=======================================');

	return [startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount];
};

export default useVisibleRange;
