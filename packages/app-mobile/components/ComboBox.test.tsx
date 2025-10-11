import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import createMockReduxStore from '../utils/testing/createMockReduxStore';
import TestProviderStack from './testing/TestProviderStack';
import ComboBox, { OnItemSelected, Option } from './ComboBox';
import { useMemo } from 'react';

interface Item {
	title: string;
}

interface WrapperProps {
	items: Item[];
	onItemSelected?: OnItemSelected;
}

const store = createMockReduxStore();
const WrappedComboBox: React.FC<WrapperProps> = ({
	items,
	onItemSelected = jest.fn(),
}: WrapperProps) => {
	const mappedItems = useMemo(() => {
		return items.map((item): Option => ({
			title: item.title,
			icon: undefined,
			accessibilityHint: undefined,
			willRemoveOnPress: false,
		}));
	}, [items]);

	return <TestProviderStack store={store}>
		<ComboBox
			items={mappedItems}
			alwaysExpand={true}
			style={{}}
			onItemSelected={onItemSelected}
			placeholder={'Test combobox'}
		/>
	</TestProviderStack>;
};

const getSearchInput = () => {
	return screen.getByPlaceholderText('Test combobox');
};
const getSearchResults = () => {
	return screen.getAllByTestId(/^search-result-/);
};

describe('ComboBox', () => {
	test('should list all items when the search query is empty', () => {
		const testItems = [
			{ title: 'test 1' },
			{ title: 'test 2' },
			{ title: 'test 3' },
		];
		const { unmount } = render(
			<WrappedComboBox
				items={testItems}
			/>,
		);

		expect(getSearchInput()).toHaveTextContent('');
		expect(getSearchResults()).toHaveLength(3);

		// Manually unmounting prevents a warning
		unmount();
	});

	test('changing the search query should limit which items are visible and be case insensitive', () => {
		const testItems = [
			{ title: 'a' },
			{ title: 'b' },
			{ title: 'c' },
			{ title: 'Aa' },
		];
		const { unmount } = render(
			<WrappedComboBox items={testItems}/>,
		);

		expect(getSearchResults()).toHaveLength(4);
		fireEvent.changeText(getSearchInput(), 'a');

		const updatedResults = getSearchResults();
		expect(updatedResults[0]).toHaveTextContent('a');
		expect(updatedResults[1]).toHaveTextContent('Aa');
		expect(updatedResults).toHaveLength(2);

		unmount();
	});
});
