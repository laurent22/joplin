import useVisibleRange from './useVisibleRange';
import { renderHook } from '@testing-library/react-hooks';
import { ItemFlow } from './types';
import { Size } from '@joplin/utils/types';

describe('useVisibleRange', () => {

	test('should calculate indexes', () => {

		// [startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount]

		const testCases: [number, Size, Size, number, ItemFlow, ReturnType<typeof useVisibleRange>][] = [
			[
				150,
				{ width: 100, height: 400 },
				{ width: 100, height: 100 },
				8,
				ItemFlow.TopToBottom,
				[1, 5, 1, 5, 8, 5],
			],
			[
				50,
				{ width: 220, height: 300 },
				{ width: 100, height: 100 },
				9,
				ItemFlow.LeftToRight,
				[0, 7, 0, 3, 5, 8],
			],
			[
				0,
				{ width: 410, height: 450 },
				{ width: 100, height: 100 },
				30,
				ItemFlow.LeftToRight,
				[0, 19, 0, 4, 8, 20],
			],
		];

		for (const [scrollTop, listSize, itemSize, noteCount, flow, expected] of testCases) {
			const { result } = renderHook(() => useVisibleRange(
				scrollTop,
				listSize,
				itemSize,
				noteCount,
				flow
			));

			expect(result.current).toEqual(expected);
		}
	});

});
