import * as React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '../utils/testing/testingLibrary';
import SelectDateTimeDialog from './SelectDateTimeDialog';
import TestProviderStack from './testing/TestProviderStack';
import createMockReduxStore from '../utils/testing/createMockReduxStore';

// Minimal theme ID (1 = light)
const themeId = 1;

// Modal uses SafeAreaProvider and FocusControl — TestProviderStack supplies both.
const store = createMockReduxStore();

const renderDialog = (props: Partial<React.ComponentProps<typeof SelectDateTimeDialog>> = {}) => {
	const defaults: React.ComponentProps<typeof SelectDateTimeDialog> = {
		themeId,
		shown: true,
		date: null,
		onAccept: jest.fn(),
		onReject: jest.fn(),
		...props,
	};
	return render(
		<TestProviderStack store={store}>
			<SelectDateTimeDialog {...defaults} />
		</TestProviderStack>,
	);
};

describe('SelectDateTimeDialog', () => {
	it('should not render when shown=false', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		const { queryByText } = renderDialog({ shown: false, onAccept, onReject });
		expect(queryByText('Set alarm')).toBeNull();
	});

	it('should render the modal when shown=true', () => {
		renderDialog();
		expect(screen.getByText('Set alarm')).toBeTruthy();
		expect(screen.getByText('Save alarm')).toBeTruthy();
		expect(screen.getByText('Clear alarm')).toBeTruthy();
		expect(screen.getByText('Cancel')).toBeTruthy();
	});

	it('should render repeat interval pills', () => {
		renderDialog();
		expect(screen.getByText('No repeat')).toBeTruthy();
		expect(screen.getByText('Daily')).toBeTruthy();
		expect(screen.getByText('Weekly')).toBeTruthy();
		expect(screen.getByText('Monthly')).toBeTruthy();
	});

	it('should initialise selectedInterval from props.interval', () => {
		renderDialog({
			date: new Date('2025-06-01T10:00:00Z'),
			interval: 'daily',
		});
		expect(screen.getByText('Daily')).toBeTruthy();
	});

	it('should call onAccept with date and selected interval when Save is pressed', () => {
		const onAccept = jest.fn();
		const date = new Date('2025-06-01T10:00:00Z');

		renderDialog({ date, interval: 'none', onAccept });

		// Press 'Weekly' pill to change interval
		fireEvent.press(screen.getByText('Weekly'));

		// Press Save
		fireEvent.press(screen.getByText('Save alarm'));

		expect(onAccept).toHaveBeenCalledTimes(1);
		const [passedDate, passedInterval] = (onAccept as jest.Mock).mock.calls[0] as [Date | null, string];
		expect(passedInterval).toBe('weekly');
		expect(passedDate).toEqual(date);
	});

	it('should call onAccept with null and none when Clear is pressed', () => {
		const onAccept = jest.fn();
		renderDialog({ date: new Date(), interval: 'daily', onAccept });

		fireEvent.press(screen.getByText('Clear alarm'));

		expect(onAccept).toHaveBeenCalledWith(null, 'none');
	});

	it('should call onReject when Cancel is pressed', () => {
		const onReject = jest.fn();
		renderDialog({ onReject });

		fireEvent.press(screen.getByText('Cancel'));

		expect(onReject).toHaveBeenCalledTimes(1);
	});
});
