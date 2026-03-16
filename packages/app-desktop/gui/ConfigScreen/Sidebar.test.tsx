import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';
import Setting, { MetadataBySection, SettingSectionSource } from '@joplin/lib/models/Setting';
import Sidebar from './Sidebar';

const createSections = (): MetadataBySection => {
	return [
		{
			name: 'general',
			source: SettingSectionSource.Default,
			metadatas: [
				{
					key: 'style.editor.fontFamily',
					value: '',
					type: Setting.TYPE_STRING,
					public: true,
					label: () => 'Editor font family',
					description: () => 'Customize the editor font.',
				},
			],
		},
		{
			name: 'sync',
			source: SettingSectionSource.Default,
			metadatas: [
				{
					key: 'sync.advanced',
					value: false,
					type: Setting.TYPE_BOOL,
					public: true,
					label: () => 'Advanced sync options',
					description: () => 'Configure advanced synchronization behavior.',
				},
			],
		},
	];
};

const renderSidebar = (searchQuery: string, onSelectionChange = jest.fn()) => {
	render(
		<ThemeProvider theme={themeStyle(Setting.THEME_LIGHT)}>
			<Sidebar
				selection='general'
				onSelectionChange={onSelectionChange}
				sections={createSections()}
				searchQuery={searchQuery}
			/>
		</ThemeProvider>,
	);

	return onSelectionChange;
};

describe('ConfigScreen Sidebar search', () => {
	test('shows matching setting rows under their section', () => {
		renderSidebar('advanced');

		expect(screen.getByText('Advanced sync options')).toBeTruthy();
		expect(screen.queryByText('Editor font family')).toBeNull();
	});

	test('shows a no-results state for an unmatched query', () => {
		renderSidebar('query-without-match');

		expect(screen.getByText('No results')).toBeTruthy();
	});

	test('passes section and setting key when clicking a matching item', () => {
		const onSelectionChange = renderSidebar('advanced');

		fireEvent.click(screen.getByRole('button', { name: 'Advanced sync options' }));

		expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({
			section: expect.objectContaining({ name: 'sync' }),
			settingKey: 'sync.advanced',
		}));
	});
});
