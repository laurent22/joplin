import * as React from 'react';

import { describe, it, expect, beforeEach } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native';

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

let store: Store<AppState>;
let registeredRuntime: RegisteredRuntime;

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
					themeId={Setting.THEME_ARITIM_DARK}
					initialText='Testing...'
					noteId=''
					style={{}}
					toolbarEnabled={true}
					readOnly={false}
					onChange={()=>{}}
					onSelectionChange={()=>{}}
					onUndoRedoDepthChange={()=>{}}
					onAttach={async ()=>{}}
					plugins={{}}
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
});
