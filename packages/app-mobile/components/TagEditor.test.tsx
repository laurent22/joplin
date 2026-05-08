import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import createMockReduxStore from '../utils/testing/createMockReduxStore';
import TestProviderStack from './testing/TestProviderStack';
import { TagEntity } from '@joplin/lib/services/database/types';
import { useEffect, useState } from 'react';
import TagEditor, { TagEditorMode } from './TagEditor';
import Setting from '@joplin/lib/models/Setting';

interface WrapperProps {
	allTags: TagEntity[];
	initialTags: string[];
	onTagsChanged: (tags: string[])=> void;
}

const emptyStyle = {};

const store = createMockReduxStore();
const WrappedTagEditor: React.FC<WrapperProps> = props => {
	const [tags, setTags] = useState(props.initialTags);

	useEffect(() => {
		props.onTagsChanged(tags);
	}, [tags, props.onTagsChanged]);

	return <TestProviderStack store={store}>
		<TagEditor
			themeId={Setting.THEME_LIGHT}
			style={emptyStyle}
			onTagsChange={setTags}
			mode={TagEditorMode.Large}
			allTags={props.allTags}
			tags={tags}
		/>
	</TestProviderStack>;
};

describe('TagEditor', () => {
	beforeEach(() => {
		jest.useFakeTimers({ advanceTimers: true });
	});

	test('clicking "remove" should remove a tag', async () => {
		const initialTags = ['test', 'testing'];
		let currentTags = initialTags;
		const onTagsChanged = (tags: string[]) => {
			currentTags = tags;
		};

		const { unmount } = render(
			<WrappedTagEditor
				allTags={initialTags.map(t => ({ title: t }))}
				initialTags={initialTags}
				onTagsChanged={onTagsChanged}
			/>,
		);

		const removeButton = screen.getByRole('button', { name: 'Remove testing' });
		fireEvent.press(removeButton);

		await act(async () => {
			jest.advanceTimersByTime(200);
			await jest.runAllTimersAsync();
		});

		expect(currentTags).toEqual(['test']);

		// Manually unmount to prevent warnings
		unmount();
	});

	test('clicking on search result should add it as a tag', () => {
		const initialTags = ['test'];
		let currentTags = initialTags;
		const onTagsChanged = (tags: string[]) => {
			currentTags = tags;
		};

		const { unmount } = render(
			<WrappedTagEditor
				allTags={[...initialTags, 'new tag 1'].map(t => ({ title: t }))}
				initialTags={initialTags}
				onTagsChanged={onTagsChanged}
			/>,
		);

		const searchInput = screen.getByPlaceholderText('Search tags');
		fireEvent.changeText(searchInput, 'new');

		const searchResult = screen.getByRole('button', { name: 'new tag 1' });
		fireEvent.press(searchResult);
		expect(currentTags).toEqual(['new tag 1', 'test']);

		// Manually unmount to prevent warnings
		unmount();
	});

	test('searching for a tag and pressing "add new" should add a new tag', () => {
		const initialTags = ['test'];
		let currentTags = initialTags;
		const onTagsChanged = (tags: string[]) => {
			currentTags = tags;
		};

		const { unmount } = render(
			<WrappedTagEditor
				allTags={initialTags.map(t => ({ title: t }))}
				initialTags={initialTags}
				onTagsChanged={onTagsChanged}
			/>,
		);

		const searchInput = screen.getByPlaceholderText('Search tags');
		fireEvent.changeText(searchInput, 'create');

		const addNewButton = screen.getByRole('button', { name: 'Add new' });
		fireEvent.press(addNewButton);
		expect(currentTags).toEqual(['create', 'test']);

		unmount();
	});
});

