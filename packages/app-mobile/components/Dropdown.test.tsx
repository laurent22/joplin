import * as React from 'react';

import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native';

import Dropdown, { DropdownListItem } from './Dropdown';

describe('Dropdown', () => {
	it('should open the dropdown on click', async () => {
		const items: DropdownListItem[] = [];
		for (let i = 0; i < 400; i++) {
			items.push({ label: `Item ${i}`, value: `${i}` });
		}

		const onValueChange = jest.fn();

		render(
			<Dropdown
				items={items}
				selectedValue={'300'}
				onValueChange={onValueChange}
			/>
		);

		// Should initially not show any other items
		expect(screen.queryByText('Item 301')).toBeNull();
		expect(screen.queryByText('Item 302')).toBeNull();

		const openButton = screen.getByText('Item 300');
		fireEvent.press(openButton);

		// Other items should now be shown
		await waitFor(() => {
			expect(screen.getByText('Item 301')).not.toBeNull();
			expect(screen.getByText('Item 299')).not.toBeNull();
		});

		// Pressing one of these items should hide the dropdown
		fireEvent.press(screen.getByText('Item 301'));

		// We haven't changed the selectedValue, so Item 301 should no longer be visible
		await waitFor(() => {
			expect(screen.queryByText('Item 301')).toBeNull();
		});

		expect(onValueChange).toHaveBeenLastCalledWith('301');

		// The dropdown should still be clickable
		fireEvent.press(screen.getByText('Item 300'));

		await waitFor(() => {
			expect(screen.queryByText('Item 301')).not.toBeNull();
		});
	});
});
