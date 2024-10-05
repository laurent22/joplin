import type * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import useQueuedAsyncEffect from './useQueuedAsyncEffect';
import { runWithFakeTimers } from '../testing/test-utils';

describe('useQueuedAsyncEffect', () => {
	test('should debounce effect updates', async () => {
		const effectFunction = jest.fn(async () => { });
		const useTestHook = (dependencies: React.DependencyList) => {
			return useQueuedAsyncEffect(effectFunction, dependencies);
		};

		await runWithFakeTimers(async () => {
			const result = renderHook(useTestHook, { initialProps: ['test'] });

			// Should pause to allow debouncing.
			expect(effectFunction).not.toHaveBeenCalled();

			await jest.advanceTimersByTimeAsync(12500);
			expect(effectFunction).toHaveBeenCalledTimes(1);

			await jest.advanceTimersByTimeAsync(1000);

			// Changing twice quickly: Should only update once
			result.rerender(['changed']);
			expect(effectFunction).toHaveBeenCalledTimes(1);
			result.rerender(['changed again']);
			await jest.advanceTimersByTimeAsync(500);
			expect(effectFunction).toHaveBeenCalledTimes(2);

			await jest.advanceTimersByTimeAsync(500);
			expect(effectFunction).toHaveBeenCalledTimes(2);
		});
	});
});
