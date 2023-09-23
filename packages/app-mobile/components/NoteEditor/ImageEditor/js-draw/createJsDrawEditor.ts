
import { Editor, AbstractToolbar, EditorEventType, EditorSettings, getLocalizationTable, adjustEditorThemeForContrast } from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/bundledStyles';
import applyTemplateToEditor from './applyTemplateToEditor';
import watchEditorForTemplateChanges from './watchEditorForTemplateChanges';
import { ImageEditorCallbacks, LocalizableStrings } from './types';
import startAutosaveLoop from './startAutosaveLoop';

declare namespace ReactNativeWebView {
	const postMessage: (data: any)=> void;
}

const restoreToolbarState = (toolbar: AbstractToolbar, state: string) => {
	if (state) {
		// deserializeState throws on invalid argument.
		try {
			toolbar.deserializeState(state);
		} catch (e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

const listenToolbarState = (editor: Editor, toolbar: AbstractToolbar) => {
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		const state = toolbar.serializeState();
		ReactNativeWebView.postMessage(
			JSON.stringify({
				action: 'save-toolbar',
				data: state,
			}),
		);
	});
};


export const createJsDrawEditor = (
	callbacks: ImageEditorCallbacks,
	initialToolbarState: string,
	locale: string,

	additionalLocalizationStrings: LocalizableStrings,

	// Intended for automated tests.
	editorSettings: Partial<EditorSettings> = {},
) => {
	const parentElement = document.body;
	const editor = new Editor(parentElement, {
		// Try to use the Joplin locale, but fall back to the system locale if
		// js-draw doesn't support it.
		localization: getLocalizationTable([locale, ...navigator.languages]),
		iconProvider: new MaterialIconProvider(),
		...editorSettings,
	});

	const toolbar = editor.addToolbar();

	const maxSpacerSize = '20px';
	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	toolbar.addExitButton(() => callbacks.closeEditor());

	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	const saveNow = () => {
		return callbacks.saveDrawing(editor.toSVG({
			// Grow small images to this minimum size
			minDimension: 50,
		}), false);
	};

	const saveButton = toolbar.addSaveButton(saveNow);

	restoreToolbarState(toolbar, initialToolbarState);
	listenToolbarState(editor, toolbar);

	const imageChangeListener = editor.notifier.on(EditorEventType.UndoRedoStackUpdated, () => {
		if (editor.history.undoStackSize > 0) {
			callbacks.setImageHasChanges(true);

			// Don't listen for the undoStackSize to go back to zero -- the editor
			// has a maximum undo stack size, so it's possible, after pressing 'undo' many times,
			// to have an undo stack size of zero and changes to the document.
			imageChangeListener.remove();
		}
	});

	// Show a loading message until the template is loaded.
	editor.showLoadingWarning(0);
	editor.setReadOnly(true);

	// Also disable save (a full save can't be done until the entire image
	// has been loaded).
	saveButton.setDisabled(true);

	const editorControl = {
		editor,
		loadImageOrTemplate: async (svgData: string|undefined, templateData: string) => {
			// loadFromSVG shows its own loading message. Hide the original.
			editor.hideLoadingWarning();

			if (svgData && svgData.length > 0) {
				await editor.loadFromSVG(svgData);
			} else {
				await applyTemplateToEditor(editor, templateData);
			}

			// We can now save safely (without data loss).
			saveButton.setDisabled(false);
			editor.setReadOnly(false);

			void startAutosaveLoop(editor, callbacks.saveDrawing, additionalLocalizationStrings);
			watchEditorForTemplateChanges(editor, templateData, callbacks.updateEditorTemplate);
		},
		onThemeUpdate: () => {
			// Slightly adjusts the given editor's theme colors. This ensures that the colors chosen for
			// the editor have proper contrast.
			adjustEditorThemeForContrast(editor);
		},
		saveNow,
	};

	editorControl.onThemeUpdate();

	return editorControl;
};


export default createJsDrawEditor;
