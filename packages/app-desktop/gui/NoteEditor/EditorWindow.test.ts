import { buildEditorWindowTitle } from './EditorWindow';

describe('buildEditorWindowTitle', () => {

	test.each([
		['My note', true, 'Joplin - My note'],
		['My note', false, 'My note'],
		['Untitled', true, 'Joplin - Untitled'],
		['Untitled', false, 'Untitled'],
	])('should build the editor window title for noteTitle=%p showAppNameInWindowTitle=%p', (noteTitle, showAppNameInWindowTitle, expected) => {
		expect(buildEditorWindowTitle(noteTitle, showAppNameInWindowTitle)).toBe(expected);
	});

});
