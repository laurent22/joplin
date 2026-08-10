import * as React from 'react';
import createEditorSettings from '@joplin/editor/testing/createEditorSettings';
import { EditorProps } from '../types';
import Setting from '@joplin/lib/models/Setting';

const defaultEditorSettings = { ...createEditorSettings(Setting.THEME_LIGHT), themeId: Setting.THEME_LIGHT };
const defaultWrapperProps: EditorProps = {
	noteResources: {},
	webviewRef: React.createRef(),
	editorRef: React.createRef(),
	themeId: Setting.THEME_LIGHT,
	noteHash: '',
	noteId: '',
	initialText: '',
	initialScroll: 0,
	editorSettings: defaultEditorSettings,
	initialSelection: { start: 0, end: 0 },
	globalSearch: '',
	plugins: {},
	onAttach: () => Promise.resolve(),
	onEditorEvent: () => {},
};

const createTestEditorProps = () => ({ ...defaultWrapperProps });
export default createTestEditorProps;
