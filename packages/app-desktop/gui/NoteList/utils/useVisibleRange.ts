import { Size } from '@joplin/utils/types';
import { useMemo } from 'react';

const useVisibleRange = (scrollTop: number, listSize: Size, itemSize: Size, noteCount: number) => {
	const visibleItemCount = useMemo(() => {
		return Math.ceil(listSize.height / itemSize.height);
	}, [listSize.height, itemSize.height]);

	const startNoteIndex = useMemo(() => {
		return Math.floor(scrollTop / itemSize.height);
	}, [scrollTop, itemSize.height]);

	const endNoteIndex = useMemo(() => {
		let output = startNoteIndex + (visibleItemCount - 1);
		if (output >= noteCount) output = noteCount - 1;
		return output;
	}, [visibleItemCount, startNoteIndex, noteCount]);

	return [startNoteIndex, endNoteIndex, visibleItemCount];
};

export default useVisibleRange;
