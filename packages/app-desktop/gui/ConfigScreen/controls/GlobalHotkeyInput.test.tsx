import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import GlobalHotkeyInput from './GlobalHotkeyInput';

describe('GlobalHotkeyInput', () => {
	test('should render ShortcutRecorder with Save and Restore buttons', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		// ShortcutRecorder is always visible with its built-in buttons
		expect(screen.getByText('Save')).toBeTruthy();
		expect(screen.getByText('Restore')).toBeTruthy();
		expect(screen.getByText('Cancel')).toBeTruthy();
	});

	test('should clear value when Restore is clicked', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Restore'));
		expect(onChange).toHaveBeenCalledWith({ value: '' });
	});
});
