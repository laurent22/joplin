import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { render, waitFor } from '../../utils/testing/testingLibrary';

import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import createTestEditorProps from './testing/createTestEditorProps';
import { EditorEvent, EditorEventType } from '@joplin/editor/events';
import { RefObject, useCallback } from 'react';
import { EditorCommandType, EditorControl } from '@joplin/editor/types';
import MarkdownEditor from './MarkdownEditor';


interface WrapperProps {
	ref?: RefObject<EditorControl>;
	onBodyChange: (newBody: string)=> void;
	noteBody: string;
}

const defaultEditorProps = createTestEditorProps();
const testStore = createMockReduxStore();
const WrappedEditor: React.FC<WrapperProps> = (
	{
		noteBody,
		onBodyChange,
		ref,
	}: WrapperProps,
) => {
	const onEvent = useCallback((event: EditorEvent) => {
		if (event.kind === EditorEventType.Change) {
			onBodyChange(event.value);
		}
	}, [onBodyChange]);

	return <TestProviderStack store={testStore}>
		<MarkdownEditor
			{...defaultEditorProps}
			onEditorEvent={onEvent}
			initialText={noteBody}
			editorRef={ref ?? defaultEditorProps.editorRef}
		/>
	</TestProviderStack>;
};

describe('MarkdownEditor', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('editor.codeView', true);
	});

	// Regression test for #13193. This verifies that the editor can be reached
	// over IPC.
	it('should support the "textBold" command', async () => {
		let editorBody = 'test';
		const editorRef = React.createRef<EditorControl|null>();
		render(<WrappedEditor
			ref={editorRef}
			noteBody={editorBody}
			onBodyChange={newValue => { editorBody = newValue; }}
		/>);

		// Should mark the command as supported
		expect(await editorRef.current.supportsCommand(EditorCommandType.ToggleBolded));

		// Command should run
		await editorRef.current.execCommand(EditorCommandType.SelectAll);
		await editorRef.current.execCommand(EditorCommandType.ToggleBolded);
		await waitFor(() => {
			expect(editorBody).toBe('**test**');
		});
	});
});
