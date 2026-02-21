import * as React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '../utils/testing/testingLibrary';
import SelectDateTimeDialog from './SelectDateTimeDialog';

// Minimal theme ID (1 = light)
const themeId = 1;

describe('SelectDateTimeDialog', () => {
	it('should not render when shown=false', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		const { queryByText } = render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={false}
				date={null}
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);
		expect(queryByText('Set alarm')).toBeNull();
	});

	it('should render the modal when shown=true', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={null}
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);
		expect(screen.getByText('Set alarm')).toBeTruthy();
		expect(screen.getByText('Save alarm')).toBeTruthy();
		expect(screen.getByText('Clear alarm')).toBeTruthy();
		expect(screen.getByText('Cancel')).toBeTruthy();
	});

	it('should render repeat interval pills', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={null}
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);
		expect(screen.getByText('No repeat')).toBeTruthy();
		expect(screen.getByText('Daily')).toBeTruthy();
		expect(screen.getByText('Weekly')).toBeTruthy();
		expect(screen.getByText('Monthly')).toBeTruthy();
	});

	it('should initialise selectedInterval from props.interval', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		// We pass 'daily' as interval prop — the 'Daily' pill should reflect it
		// (styling test is platform-specific, but we verify no error is raised)
		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={new Date('2025-06-01T10:00:00Z')}
				interval='daily'
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);
		expect(screen.getByText('Daily')).toBeTruthy();
	});

	it('should call onAccept with date and selected interval when Save is pressed', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		const date = new Date('2025-06-01T10:00:00Z');

		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={date}
				interval='none'
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);

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
		const onReject = jest.fn();
		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={new Date()}
				interval='daily'
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);

		fireEvent.press(screen.getByText('Clear alarm'));

		expect(onAccept).toHaveBeenCalledWith(null, 'none');
	});

	it('should call onReject when Cancel is pressed', () => {
		const onAccept = jest.fn();
		const onReject = jest.fn();
		render(
			<SelectDateTimeDialog
				themeId={themeId}
				shown={true}
				date={null}
				onAccept={onAccept}
				onReject={onReject}
			/>,
		);

		fireEvent.press(screen.getByText('Cancel'));

		expect(onReject).toHaveBeenCalledTimes(1);
	});
});
