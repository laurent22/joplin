import * as React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Store } from 'redux';
import { Provider } from 'react-redux';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { defaultWindowId } from '@joplin/lib/reducer';
import KeymapService from '@joplin/lib/services/KeymapService';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { newWhiteboardBody, serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';
import initializeCommandService from '../../utils/initializeCommandService';
import menuCommandNames from '../menuCommandNames';
import { createAppDefaultState } from '../../app.reducer';
import NoteEditor from './NoteEditor';
import { NoteBodyEditorProps } from './utils/types';

jest.mock('./NoteBody/WhiteboardEditor/WhiteboardEditor', () => (props: NoteBodyEditorProps) => (
	<textarea aria-label='Whiteboard' value={props.content} onChange={event => props.onChange({ changeId: null, content: event.target.value })}/>
));

describe('NoteEditor', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should keep the title of a new whiteboard when its body changes', async () => {
		const note = await Note.save({ title: 'New whiteboard', body: newWhiteboardBody() });
		const state = { ...createAppDefaultState({}), settings: Setting.toPlainObject(), selectedNoteIds: [note.id], provisionalNoteIds: [note.id] };
		const store = { getState: () => state, subscribe: () => () => {}, dispatch: jest.fn() };
		initializeCommandService(store, false);
		KeymapService.instance().initialize(menuCommandNames());
		const view = render(<Provider store={store as unknown as Store}><NoteEditor windowId={defaultWindowId} startupPluginsLoaded={true}/></Provider>);

		const newBody = serializeWhiteboard(newWhiteboardBody(), {
			nodes: [{ id: 'card1', type: 'text', text: 'Weekly planning', x: 0, y: 0, width: 250, height: 60 }],
			edges: [],
		});
		fireEvent.change(await view.findByLabelText('Whiteboard'), { target: { value: newBody } });

		await waitFor(async () => expect(await Note.load(note.id)).toMatchObject({ body: newBody, title: 'New whiteboard' }));
	});
});
