
import { Editor, AbstractToolbar, EditorEventType, EditorSettings, getLocalizationTable, adjustEditorThemeForContrast, BaseWidget } from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/bundledStyles';
import applyTemplateToEditor from './applyTemplateToEditor';
import watchEditorForTemplateChanges from './watchEditorForTemplateChanges';
import { ImageEditorCallbacks, ImageEditorControl, LocalizedStrings } from './types';
import startAutosaveLoop from './startAutosaveLoop';
import WebViewToRNMessenger from '../../../../utils/ipc/WebViewToRNMessenger';
import './polyfills';


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

export const createMessenger = () => {
	const messenger = new WebViewToRNMessenger<ImageEditorControl, ImageEditorCallbacks>(
		'image-editor', {},
	);
	return messenger;
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
		clipboardApi: {
			read: async () => {
				const result = new Map<string, string>();

				const clipboardText = await callbacks.readClipboardText();
				if (clipboardText) {
					result.set('text/plain', clipboardText);
				}

				return result;
			},
			write: async (data) => {
				const getTextForMime = async (mime: string) => {
					const text = data.get(mime);
					if (typeof text === 'string') {
						return text;
					}
					if (text) {
						return await (await text).text();
					}
					return null;
				};

				const svgData = await getTextForMime('image/svg+xml');
				if (svgData) {
					return callbacks.writeClipboardText(svgData);
				}

				const textData = await getTextForMime('text/plain');
				return callbacks.writeClipboardText(textData);
			},
		},
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

	const getEditorSVG = () => {
		return editor.toSVG({
			// Grow small images to this minimum size
			minDimension: 50,
		}).outerHTML;
	};

	const saveNow = () => {
		callbacks.save(getEditorSVG(), false);

		// The image is now up-to-date with the resource
		setImageHasChanges(false);
	};

	saveButton = toolbar.addSaveButton(saveNow);

	// Load and save toolbar-related state (e.g. pen sizes/colors).
	restoreToolbarState(toolbar, initialToolbarState);
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		callbacks.updateToolbarState(toolbar.serializeState());
	});

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

	const fetchInitialSvgData = (resourceUrl: string) => {
		return new Promise<string>((resolve, reject) => {
			if (!resourceUrl) {
				resolve('');
				return;
			}

			// fetch seems to be unable to request file:// URLs.
			// https://github.com/react-native-webview/react-native-webview/issues/1560#issuecomment-1783611805
			const request = new XMLHttpRequest();

			const onError = () => {
				reject(new Error(`Failed to load initial SVG data: ${request.status}, ${request.statusText}, ${request.responseText}`));
			};

			request.addEventListener('load', _ => {
				resolve(request.responseText);
			});
			request.addEventListener('error', onError);
			request.addEventListener('abort', onError);

			request.open('GET', resourceUrl);
			request.send();
		});
	};

	const editorControl = {
		editor,
		loadImageOrTemplate: async (resourceUrl: string, templateData: string, svgData: string|undefined) => {
			// loadFromSVG shows its own loading message. Hide the original.
			editor.hideLoadingWarning();

			// On mobile, fetching the SVG data is much faster than transferring it via IPC. However, fetch
			// doesn't work for this when running in a web browser (virtual file system).
			svgData ??= await fetchInitialSvgData(resourceUrl);

			// Load from a template if no initial data
			if (svgData === '') {
				await applyTemplateToEditor(editor, templateData);
			} else {
				await editor.loadFromSVG(svgData);
			}

			// We can now edit and save safely (without data loss).
			editor.setReadOnly(false);

			void startAutosaveLoop(editor, callbacks.save);
			watchEditorForTemplateChanges(editor, templateData, callbacks.updateEditorTemplate);
		},
		onThemeUpdate: () => {
			// Slightly adjusts the given editor's theme colors. This ensures that the colors chosen for
			// the editor have proper contrast.
			adjustEditorThemeForContrast(editor);
		},
		saveNow,
		saveThenExit: async () => {
			callbacks.saveThenClose(getEditorSVG());
		},
	};

	editorControl.onThemeUpdate();

	callbacks.onLoadedEditor();

	return editorControl;
};


export default createJsDrawEditor;
