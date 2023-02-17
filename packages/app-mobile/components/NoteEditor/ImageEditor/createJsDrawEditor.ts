
import Editor, { EditorEventType, HTMLToolbar } from 'js-draw';
import 'js-draw/bundle';

declare namespace ReactNativeWebView {
	const postMessage: (data: any)=> void;
}

interface ImageEditorStrings {
	close: string;
	save: string;
}

interface ImageEditorCallbacks {
	saveDrawing: ()=> void;
	autosaveDrawing: ()=> void;
	closeEditor: ()=> void;

	setImageHasChanges: (hasChanges: boolean)=> void;
}

export const createJsDrawEditor = (
	strings: ImageEditorStrings,
	callbacks: ImageEditorCallbacks,
	initialToolbarState: string
): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);

	const toolbar = editor.addToolbar();

	const maxSpacerSize = '20px';
	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	toolbar.addActionButton({
		label: strings.close,
		icon: makeCloseIcon(),
	}, () => callbacks.closeEditor());

	toolbar.addSpacer({
		grow: 1,
		maxSize: maxSpacerSize,
	});

	toolbar.addActionButton({
		label: strings.save,
		icon: editor.icons.makeSaveIcon(),
	}, () => callbacks.saveDrawing());

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

const makeCloseIcon = () => {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.innerHTML = `
		<style>
			.toolbar-close-icon {
				stroke: var(--icon-color);
				stroke-width: 10;
				stroke-linejoin: round;
				stroke-linecap: round;
				fill: none;
			}
		</style>
		<path
			d='
				M 15,15 85,85
				M 15,85 85,15
			'
			class='toolbar-close-icon'
		/>
	`;
	svg.setAttribute('viewBox', '0 0 100 100');
	return svg;
};

const restoreToolbarState = (toolbar: HTMLToolbar, state: string) => {
	if (state) {
		// deserializeState throws on invalid argument.
		try {
			toolbar.deserializeState(state);
		} catch (e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

const listenToolbarState = (editor: Editor, toolbar: HTMLToolbar) => {
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		const state = toolbar.serializeState();
		ReactNativeWebView.postMessage(
			JSON.stringify({
				action: 'save-toolbar',
				data: state,
			})
		);
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
