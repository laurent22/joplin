import Setting from '@joplin/lib/models/Setting';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
const openEditorModeSelector = (dispatch: Function) => {
	try {
		const hasModeSelectorFlag = Setting.keyExists('editor.modeSelectorShown');
		if (!hasModeSelectorFlag) return false;
		if (Setting.value('editor.modeSelectorShown')) return false;
	} catch (_error) {
		return false;
	}

	dispatch({
		type: 'DIALOG_OPEN',
		name: 'editorModeSelector',
	});

	return true;
};

export default openEditorModeSelector;
