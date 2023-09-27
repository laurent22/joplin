
import { Editor, AbstractToolbar, EditorEventType, EditorSettings, getLocalizationTable, adjustEditorThemeForContrast, BaseWidget } from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/bundledStyles';
import applyTemplateToEditor from './applyTemplateToEditor';
import watchEditorForTemplateChanges from './watchEditorForTemplateChanges';
import { ImageEditorCallbacks, LocalizedStrings } from './types';
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
	defaultLocalizations: LocalizedStrings,

	// Intended for automated tests.
	editorSettings: Partial<EditorSettings> = {},
) => {
	const parentElement = document.body;
	const editor = new Editor(parentElement, {
		// Try to use the Joplin locale, but fall back to the system locale if
		// js-draw doesn't support it.
		localization: {
			...getLocalizationTable([locale, ...navigator.languages]),
			...defaultLocalizations,
		},
		iconProvider: new MaterialIconProvider(),
		...editorSettings,
	});

	const toolbar = editor.addToolbar();

	const maxSpacerSize = '20px';
	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	// Override the default "Exit" label:
	toolbar.addExitButton(
		() => callbacks.closeEditor(true), {
			label: defaultLocalizations.close,
		},
	);

	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	// saveButton needs to be defined after the following callbacks.
	// As such, this variable can't be made const.
	// eslint-disable-next-line prefer-const
	let saveButton: BaseWidget;

	let lastHadChanges: boolean|null = null;
	const setImageHasChanges = (hasChanges: boolean) => {
		if (lastHadChanges !== hasChanges) {
			saveButton.setDisabled(!hasChanges);
			callbacks.setImageHasChanges(hasChanges);
			lastHadChanges = hasChanges;
		}
	};

	const saveNow = () => {
		callbacks.saveDrawing(editor.toSVG({
			// Grow small images to this minimum size
			minDimension: 50,
		}), false);

		// The image is now up-to-date with the resource
		setImageHasChanges(false);
	};

	saveButton = toolbar.addSaveButton(saveNow);

	// Load and save toolbar-realated state (e.g. pen sizes/colors).
	restoreToolbarState(toolbar, initialToolbarState);
	listenToolbarState(editor, toolbar);

	setImageHasChanges(false);

	editor.notifier.on(EditorEventType.UndoRedoStackUpdated, () => {
		setImageHasChanges(true);
	});

	// Disable save (a full save can't be done until the entire image
	// has been loaded).
	saveButton.setDisabled(true);

	// Show a loading message until the template is loaded.
	editor.showLoadingWarning(0);
	editor.setReadOnly(true);

	const editorControl = {
		editor,
		loadImageOrTemplate: async (svgData: string|undefined, templateData: string) => {
			// loadFromSVG shows its own loading message. Hide the original.
			editor.hideLoadingWarning();

			if (svgData && svgData.length > 0) {
				await editor.loadFromSVG(svgData);
			} else {
				await applyTemplateToEditor(editor, templateData);

				// The editor expects to be saved initially (without
				// unsaved changes). Save now.
				saveNow();
			}

			// We can now edit and save safely (without data loss).
			editor.setReadOnly(false);

			void startAutosaveLoop(editor, callbacks.saveDrawing);
			watchEditorForTemplateChanges(editor, templateData, callbacks.updateEditorTemplate);
		},
		onThemeUpdate: () => {
			// Slightly adjusts the given editor's theme colors. This ensures that the colors chosen for
			// the editor have proper contrast.
			adjustEditorThemeForContrast(editor);
		},
		saveNow,
		saveThenExit: async () => {
			saveNow();

			// Don't show a confirmation dialog -- it's possible that
			// the code outside of the WebView still thinks changes haven't
			// been saved:
			const showConfirmation = false;
			callbacks.closeEditor(showConfirmation);
		},
	};

	editorControl.onThemeUpdate();

	return editorControl;
};


export default createJsDrawEditor;
