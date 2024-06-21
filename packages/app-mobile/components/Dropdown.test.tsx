import * as React from 'react';
import { Text } from 'react-native';

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
				selectedValue={'1'}
				onValueChange={onValueChange}
			/>,
		);

		// Should initially not show any other items
		expect(screen.queryByText('Item 3')).toBeNull();
		expect(screen.queryByText('Item 4')).toBeNull();

		const openButton = screen.getByText('Item 1');
		fireEvent.press(openButton);

		// Other items should now be shown
		await waitFor(() => {
			expect(screen.getByText('Item 3')).not.toBeNull();
			expect(screen.getByText('Item 4')).not.toBeNull();
		});

		// Pressing one of these items should hide the dropdown
		fireEvent.press(screen.getByText('Item 4'));

		// We haven't changed the selectedValue, so Item 301 should no longer be visible
		await waitFor(() => {
			expect(screen.queryByText('Item 4')).toBeNull();
		});

		expect(onValueChange).toHaveBeenLastCalledWith('4');

		// The dropdown should still be clickable
		fireEvent.press(screen.getByText('Item 1'));

		await waitFor(() => {
			expect(screen.queryByText('Item 2')).not.toBeNull();
		});
	});

	it('should hide coverableChildren to increase space', async () => {
		render(
			<Dropdown
				items={[{ label: 'Test1', value: '1' }, { label: 'Test2', value: '2' }, { label: 'Test3', value: '3' }]}
				selectedValue={'1'}
				onValueChange={()=>{}}
				coverableChildrenRight={<Text>Elem Right</Text>}
			/>,
		);


		expect(screen.queryByText('Test2')).toBeNull();
		expect(screen.getByText('Elem Right')).not.toBeNull();

		// Open the dropdown
		fireEvent.press(screen.getByText('Test1'));

		// Should show the dropdown and hide the right content.
		await waitFor(() => {
			expect(screen.queryByText('Test2')).not.toBeNull();
		});
		expect(screen.queryByText('Elem Right')).toBeNull();


		// Should hide the dropdown and show the right content.
		fireEvent.press(screen.getByText('Test3'));
		await waitFor(() => {
			expect(screen.queryByText('Test2')).toBeNull();
		});
		expect(screen.queryByText('Elem Right')).not.toBeNull();
	});
});
