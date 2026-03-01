import Setting from '@joplin/lib/models/Setting';
import openEditorModeSelector from './editorModeSelectorStartup';

describe('openEditorModeSelectorIfNeeded', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('opens the dialog when the flag is false', () => {
		jest.spyOn(Setting, 'keyExists').mockReturnValue(true);
		jest.spyOn(Setting, 'value').mockReturnValue(false);
		const dispatch = jest.fn();

		expect(openEditorModeSelector(dispatch)).toBe(true);
		expect(dispatch).toHaveBeenCalledWith({ type: 'DIALOG_OPEN', name: 'editorModeSelector' });
	});

	test('does not open the dialog when the flag is true', () => {
		jest.spyOn(Setting, 'keyExists').mockReturnValue(true);
		jest.spyOn(Setting, 'value').mockReturnValue(true);
		const dispatch = jest.fn();

		expect(openEditorModeSelector(dispatch)).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

});
