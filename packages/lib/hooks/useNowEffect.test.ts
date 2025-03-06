import type * as React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import useNowEffect from './useNowEffect';

describe('useNowEffect', () => {
	test('should call the cleanup callback when the effect function is called and after unmount', async () => {
		const cleanupFunction = jest.fn(() => {});
		const effectFunction = jest.fn(() => cleanupFunction);
		const useTestHook = (dependencies: React.DependencyList) => {
			return useNowEffect(effectFunction, dependencies);
		};

		const hook = renderHook(useTestHook, { initialProps: [0] });
		expect(cleanupFunction).not.toHaveBeenCalled();
		expect(effectFunction).toHaveBeenCalledTimes(1);

		hook.rerender([0]);
		expect(cleanupFunction).not.toHaveBeenCalled();
		expect(effectFunction).toHaveBeenCalledTimes(1);

		hook.rerender([1]);
		expect(cleanupFunction).toHaveBeenCalledTimes(1);
		expect(effectFunction).toHaveBeenCalledTimes(2);

		hook.unmount();
		expect(cleanupFunction).toHaveBeenCalledTimes(2);
		expect(effectFunction).toHaveBeenCalledTimes(2);
	});
});
