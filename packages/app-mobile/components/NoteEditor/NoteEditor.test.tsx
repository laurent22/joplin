import * as React from 'react';

import { describe, it, expect, beforeEach } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native';

import NoteEditor from './NoteEditor';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { MenuProvider } from 'react-native-popup-menu';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

describe('NoteEditor', () => {
	beforeEach(async () => {
		// Required to use ExtendedWebView
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	it('should hide the markdown toolbar when the window is small', async () => {
		const wrappedNoteEditor = render(
			<MenuProvider>
				<NoteEditor
					themeId={Setting.THEME_ARITIM_DARK}
					initialText='Testing...'
					style={{}}
					toolbarEnabled={true}
					readOnly={false}
					onChange={()=>{}}
					onSelectionChange={()=>{}}
					onUndoRedoDepthChange={()=>{}}
					onAttach={()=>{}}
				/>
			</MenuProvider>,
		);

		// Maps from screen height to whether the markdown toolbar should be visible.
		const testCases: [number, boolean][] = [
			[10, false],
			[1000, true],
			[100, false],
			[80, false],
			[600, true],
		];

		const noteEditorRoot = await wrappedNoteEditor.findByTestId('note-editor-root');

		const setRootHeight = (height: number) => {
			act(() => {
				// See https://stackoverflow.com/a/61774123
				fireEvent(noteEditorRoot, 'layout', {
					nativeEvent: {
						layout: { height },
					},
				});
			});
		};

		for (const [height, visible] of testCases) {
			setRootHeight(height);

			await waitFor(async () => {
				const showMoreButton = await screen.queryByLabelText(_('Show more actions'));
				if (visible) {
					expect(showMoreButton).not.toBeNull();
				} else {
					expect(showMoreButton).toBeNull();
				}
			});
		}
	});
});
