import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import GlobalHotkeyInput from './GlobalHotkeyInput';

describe('GlobalHotkeyInput', () => {
	test('should render current value with Change and Clear buttons', () => {
		const onChange = jest.fn();
		const { rerender } = render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		// Empty state: shows "Not set", no Clear button
		expect(screen.getByText('Not set')).toBeTruthy();
		expect(screen.getByText('Change')).toBeTruthy();
		expect(screen.queryByText('Clear')).toBeNull();

		// With value: shows shortcut and Clear button
		rerender(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);
		expect(screen.getByText('CommandOrControl+Shift+J')).toBeTruthy();
		expect(screen.getByText('Clear')).toBeTruthy();
	});

	test('should clear value when Clear is clicked', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Clear'));
		expect(onChange).toHaveBeenCalledWith({ value: '' });
	});

	test('should show ShortcutRecorder when Change is clicked', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Change'));
		// ShortcutRecorder renders a Save button and a Cancel button
		expect(screen.getByText('Save')).toBeTruthy();
		expect(screen.getByText('Cancel')).toBeTruthy();
	});
});
