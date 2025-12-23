import * as React from 'react';

import { describe, it, expect, beforeEach } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';

import NoteEditor from './NoteEditor';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import commandDeclarations from './commandDeclarations';
import CommandService, { RegisteredRuntime } from '@joplin/lib/services/CommandService';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import mockCommandRuntimes from '../EditorToolbar/testing/mockCommandRuntimes';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import { MarkupLanguage } from '@joplin/renderer';
import { EditorType } from './types';

let store: Store<AppState>;
let registeredRuntime: RegisteredRuntime;

const defaultEditorProps = {
	themeId: Setting.THEME_ARITIM_DARK,
	markupLanguage: MarkupLanguage.Markdown,
	initialText: 'Testing...',
	globalSearch: '',
	noteId: '',
	noteHash: '',
	initialScroll: 0,
	style: {},
	toolbarEnabled: true,
	readOnly: false,
	onChange: ()=>{},
	onSelectionChange: ()=>{},
	onUndoRedoDepthChange: ()=>{},
	onScroll: ()=>{},
	onAttach: async ()=>{},
	onSearchVisibleChange: ()=>{},
	noteResources: {},
	plugins: {},
	mode: EditorType.Markdown,
};

describe('NoteEditor', () => {
	beforeAll(() => {
		// This allows the NoteEditor test to register editor commands without errors.
		for (const declaration of commandDeclarations) {
			CommandService.instance().registerDeclaration(declaration);
		}
	});

	beforeEach(async () => {
		// Required to use ExtendedWebView
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);
		registeredRuntime = mockCommandRuntimes(store);
	});

	afterEach(() => {
		registeredRuntime.deregister();
	});

	it('should hide the markdown toolbar when the window is small', async () => {
		const wrappedNoteEditor = render(
			<TestProviderStack store={store}>
				<NoteEditor
					ref={undefined}
					{...defaultEditorProps}
				/>
			</TestProviderStack>,
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
				const toolbarButton = await screen.queryByLabelText(_('Bold'));
				if (visible) {
					expect(toolbarButton).not.toBeNull();
				} else {
					expect(toolbarButton).toBeNull();
				}
			});
		}

		wrappedNoteEditor.unmount();
	});

	it('should show a warning banner the first time the Rich Text Editor is used', () => {
		const wrappedNoteEditor = render(
			<TestProviderStack store={store}>
				<NoteEditor
					ref={undefined}
					{...defaultEditorProps}
					mode={EditorType.RichText}
				/>
			</TestProviderStack>,
		);

		const warningBannerQuery = /This Rich Text editor has a number of limitations.*/;
		const warning = screen.getByText(warningBannerQuery);
		expect(warning).toBeVisible();

		// Pressing dismiss should dismiss the warning
		const dismissButton = screen.getByHintText('Hides warning');
		fireEvent.press(dismissButton);
		expect(screen.queryByText(warningBannerQuery)).toBeNull();

		wrappedNoteEditor.unmount();
	});
});
