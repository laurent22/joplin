
import { Editor, BackgroundComponentBackgroundType, AbstractComponent, AbstractToolbar, BackgroundComponent, EditorEventType, EditorSettings, Erase, getLocalizationTable, Rect2, Vec2, adjustEditorThemeForContrast } from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/bundledStyles';

declare namespace ReactNativeWebView {
	const postMessage: (data: any)=> void;
}

export interface ImageEditorCallbacks {
	saveDrawing: ()=> void;
	autosaveDrawing: ()=> void;
	closeEditor: ()=> void;

	setImageHasChanges: (hasChanges: boolean)=> void;
}

// Slightly adjusts the given editor's theme colors. This ensures that the colors chosen for
// the editor have proper contrast.
export const onEditorThemeUpdate = (editor: Editor) => {
	adjustEditorThemeForContrast(editor);
};

export const createJsDrawEditor = (
	callbacks: ImageEditorCallbacks,
	initialToolbarState: string,
	locale: string,

	// Intended for automated tests.
	editorSettings: Partial<EditorSettings> = {},
): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement, {
		// Try to use the Joplin locale, but fall back to the system locale if
		// js-draw doesn't support it.
		localization: getLocalizationTable([locale, ...navigator.languages]),
		iconProvider: new MaterialIconProvider(),
		...editorSettings,
	});
	onEditorThemeUpdate(editor);

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

	toolbar.addSaveButton(() => callbacks.saveDrawing());

	restoreToolbarState(toolbar, initialToolbarState);
	listenToolbarState(editor, toolbar);
	void startAutosaveLoop(() => callbacks.autosaveDrawing());

	const imageChangeListener = editor.notifier.on(EditorEventType.UndoRedoStackUpdated, () => {
		if (editor.history.undoStackSize > 0) {
			callbacks.setImageHasChanges(true);

			// Don't listen for the undoStackSize to go back to zero -- the editor
			// has a maximum undo stack size, so it's possible, after pressing 'undo' many times,
			// to have an undo stack size of zero and changes to the document.
			imageChangeListener.remove();
		}
	});

	return editor;
};


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

export const applyTemplateToEditor = async (editor: Editor, templateData: string) => {
	let backgroundComponent: AbstractComponent|null = null;
	let imageSize = editor.getImportExportRect().size;

	try {
		const templateJSON = JSON.parse(templateData);

		const isEmptyTemplate = !('imageSize' in templateJSON) && !('backgroundData' in templateJSON);

		// If the template is empty, add a default background
		if (isEmptyTemplate) {
			templateJSON.backgroundData = {
				'name': 'image-background',
				'zIndex': 0,
				'data': {
					'mainColor': '#ffffff',
					'backgroundType': BackgroundComponentBackgroundType.Grid,
					'gridSize': 25,
					'gridStrokeWidth': 0.7,
				},
			};
		}

		if ('backgroundData' in templateJSON) {
			backgroundComponent = AbstractComponent.deserialize(
				templateJSON['backgroundData'],
			);
		}

		if ('imageSize' in templateJSON) {
			imageSize = Vec2.ofXY(templateJSON.imageSize);
		}
	} catch (e) {
		console.error('Warning: Invalid image template data: ', e);
	}

	if (backgroundComponent) {
		// Remove the old background (if any)
		const previousBackground = editor.image.getBackgroundComponents();
		if (previousBackground.length > 0) {
			const removeBackgroundCommand = new Erase(previousBackground);
			void editor.dispatchNoAnnounce(removeBackgroundCommand, false);
		}

		// Add the new background
		const addBackgroundCommand = editor.image.addElement(backgroundComponent);
		void editor.dispatchNoAnnounce(addBackgroundCommand, false);
	}

	// Set the image size
	const imageSizeCommand = editor.setImportExportRect(new Rect2(0, 0, imageSize.x, imageSize.y));
	await editor.dispatchNoAnnounce(imageSizeCommand, false);

	// And zoom to the template (false = don't make undoable)
	await editor.dispatchNoAnnounce(editor.viewport.zoomTo(editor.getImportExportRect()), false);
};

export const watchTemplateChanges = (
	editor: Editor, initialTemplate: string, updateTemplate: (templateData: string)=> void,
) => {
	const computeTemplate = (): string => {
		let imageSize = editor.getImportExportRect().size;

		// Constrain the size: Don't allow an extremely small or extremely large tempalte.
		// Map components to constrained components.
		imageSize = imageSize.map(component => {
			const minDimen = 45;
			const maxDimen = 5000;

			return Math.max(Math.min(component, maxDimen), minDimen);
		});

		// Find the topmost background component (if any)
		let backgroundComponent: BackgroundComponent|null = null;
		for (const component of editor.image.getBackgroundComponents()) {
			if (component instanceof BackgroundComponent) {
				backgroundComponent = component;
			}
		}

		const templateData = {
			imageSize: imageSize.xy,
			backgroundData: backgroundComponent?.serialize(),
		};
		return JSON.stringify(templateData);
	};

	let lastTemplate = initialTemplate;
	const updateTemplateIfNecessary = () => {
		const newTemplate = computeTemplate();

		if (newTemplate !== lastTemplate) {
			updateTemplate(newTemplate);
			lastTemplate = newTemplate;
		}
	};

	// Whenever a command is done/undone, re-calculate the template & save.
	editor.notifier.on(EditorEventType.CommandDone, () => {
		updateTemplateIfNecessary();
	});

	editor.notifier.on(EditorEventType.CommandUndone, () => {
		updateTemplateIfNecessary();
	});
};

type AutosaveCallback = ()=> Promise<void>|void;
const startAutosaveLoop = async (autosave: AutosaveCallback) => {
	// Autosave every two minutes.
	const delayTime = 1000 * 60 * 2; // ms

	while (true) {
		await (new Promise<void>(resolve => {
			setTimeout(() => resolve(), delayTime);
		}));

		await autosave();
	}
};

export default createJsDrawEditor;
