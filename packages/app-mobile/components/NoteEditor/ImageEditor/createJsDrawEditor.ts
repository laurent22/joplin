
import Editor, { EditorEventType, HTMLToolbar } from 'js-draw';
import 'js-draw/bundle';

declare namespace ReactNativeWebView {
	const postMessage: (data: any)=> void;
}

export const makeCloseIcon = () => {
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

export const createJsDrawEditor = (): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);

	return editor;
};

export const restoreToolbarState = (toolbar: HTMLToolbar, state: string) => {
	if (state) {
		// deserializeState throws on invalid argument.
		try {
			toolbar.deserializeState(state);
		} catch (e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

export const listenToolbarState = (editor: Editor, toolbar: HTMLToolbar) => {
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
export const startAutosaveLoop = async (autosave: AutosaveCallback) => {
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
