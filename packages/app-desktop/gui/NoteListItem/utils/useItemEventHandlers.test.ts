import * as React from 'react';
import { renderHook } from '@testing-library/react';
import useItemEventHandlers from './useItemEventHandlers';

describe('useItemEventHandlers', () => {
	const onInputChange = jest.fn();
	const onClick = jest.fn();

	beforeEach(() => {
		onInputChange.mockClear();
		onClick.mockClear();
	});

	test('returns object with onInputChange and onClick', () => {
		const { result } = renderHook(() => useItemEventHandlers(onInputChange, onClick));

		expect(result.current).toHaveProperty('onInputChange', onInputChange);
		expect(result.current).toHaveProperty('onClick', onClick);
	});

	test('returns object with onClick null when passed null', () => {
		const { result } = renderHook(() => useItemEventHandlers(onInputChange, null));

		expect(result.current.onInputChange).toBe(onInputChange);
		expect(result.current.onClick).toBeNull();
	});

	test('returned handlers call the passed-in callbacks when invoked', () => {
		const { result } = renderHook(() => useItemEventHandlers(onInputChange, onClick));

		const changeEvent = { currentTarget: {} } as React.ChangeEvent<HTMLInputElement>;
		result.current.onInputChange(changeEvent);
		expect(onInputChange).toHaveBeenCalledWith(changeEvent);

		const clickEvent = {} as React.MouseEvent<HTMLElement>;
		result.current.onClick(clickEvent);
		expect(onClick).toHaveBeenCalledWith(clickEvent);
	});
});
