import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import GlobalHotkeyInput from './GlobalHotkeyInput';

describe('GlobalHotkeyInput', () => {
	test('should render with "Not set" placeholder when value is empty', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		const input = screen.getByPlaceholderText('Not set');
		expect(input).toBeTruthy();
		expect((input as HTMLInputElement).value).toBe('');
	});

	test('should display current shortcut value', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		const input = screen.getByDisplayValue('CommandOrControl+Shift+J');
		expect(input).toBeTruthy();
	});

	test('should show "Record shortcut" button', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		const button = screen.getByText('Record shortcut');
		expect(button).toBeTruthy();
	});

	test('should show "Clear" button when a value is set', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		const clearButton = screen.getByText('Clear');
		expect(clearButton).toBeTruthy();
	});

	test('should not show "Clear" button when value is empty', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		expect(screen.queryByText('Clear')).toBeNull();
	});

	test('should enter recording mode when "Record shortcut" is clicked', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));

		// Button text should change
		expect(screen.getByText('Recording...')).toBeTruthy();
		// Input should show recording placeholder
		const input = screen.getByPlaceholderText('Press a key combination...');
		expect(input).toBeTruthy();
	});

	test('should capture a key combination with modifier and call onChange', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		// Enter recording mode
		fireEvent.click(screen.getByText('Record shortcut'));

		// Simulate pressing Ctrl+Shift+J
		const input = screen.getByPlaceholderText('Press a key combination...');
		fireEvent.keyDown(input, {
			key: 'j',
			ctrlKey: true,
			shiftKey: true,
		});

		expect(onChange).toHaveBeenCalledWith({ value: 'CommandOrControl+Shift+J' });
	});

	test('should reject key presses without modifiers', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		// Enter recording mode
		fireEvent.click(screen.getByText('Record shortcut'));

		// Simulate pressing 'j' without any modifier
		const input = screen.getByPlaceholderText('Press a key combination...');
		fireEvent.keyDown(input, { key: 'j' });

		// onChange should NOT be called — bare keys are rejected
		expect(onChange).not.toHaveBeenCalled();
		// Should still be in recording mode
		expect(screen.getByText('Recording...')).toBeTruthy();
	});

	test('should ignore standalone modifier key presses', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));

		const input = screen.getByPlaceholderText('Press a key combination...');

		// Press just Shift
		fireEvent.keyDown(input, { key: 'Shift', shiftKey: true });
		expect(onChange).not.toHaveBeenCalled();

		// Press just Control
		fireEvent.keyDown(input, { key: 'Control', ctrlKey: true });
		expect(onChange).not.toHaveBeenCalled();

		// Should still be recording
		expect(screen.getByText('Recording...')).toBeTruthy();
	});

	test('should cancel recording on Escape', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));
		expect(screen.getByText('Recording...')).toBeTruthy();

		const input = screen.getByPlaceholderText('Press a key combination...');
		fireEvent.keyDown(input, { key: 'Escape' });

		// Should exit recording mode without calling onChange
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByText('Record shortcut')).toBeTruthy();
	});

	test('should clear the shortcut when "Clear" is clicked', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="CommandOrControl+Shift+J" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Clear'));

		expect(onChange).toHaveBeenCalledWith({ value: '' });
	});

	test('should map special keys correctly', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));
		const input = screen.getByPlaceholderText('Press a key combination...');

		// Test Space key
		fireEvent.keyDown(input, { key: ' ', ctrlKey: true });
		expect(onChange).toHaveBeenCalledWith({ value: 'CommandOrControl+Space' });
	});

	test('should map arrow keys correctly', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));
		const input = screen.getByPlaceholderText('Press a key combination...');

		fireEvent.keyDown(input, { key: 'ArrowUp', altKey: true });
		expect(onChange).toHaveBeenCalledWith({ value: 'Alt+Up' });
	});

	test('should handle Meta key (Cmd on Mac) as CommandOrControl', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));
		const input = screen.getByPlaceholderText('Press a key combination...');

		fireEvent.keyDown(input, { key: 'k', metaKey: true });
		expect(onChange).toHaveBeenCalledWith({ value: 'CommandOrControl+K' });
	});

	test('should cancel recording on blur', () => {
		const onChange = jest.fn();
		render(<GlobalHotkeyInput value="" themeId={1} onChange={onChange} />);

		fireEvent.click(screen.getByText('Record shortcut'));
		expect(screen.getByText('Recording...')).toBeTruthy();

		const input = screen.getByPlaceholderText('Press a key combination...');
		// eslint-disable-next-line no-restricted-properties -- fireEvent.blur is a testing-library API, not a direct DOM call
		fireEvent.blur(input);

		// Should exit recording mode
		expect(screen.getByText('Record shortcut')).toBeTruthy();
		expect(onChange).not.toHaveBeenCalled();
	});
});
