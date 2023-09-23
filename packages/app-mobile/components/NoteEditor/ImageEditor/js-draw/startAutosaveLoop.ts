
import { Editor } from 'js-draw';
import { LocalizableStrings, SaveDrawingCallback } from './types';

const startAutosaveLoop = async (
	editor: Editor,
	saveDrawing: SaveDrawingCallback,
	localization: LocalizableStrings,
) => {
	// Autosave every two minutes.
	const delayTime = 1000 * 60 * 2; // ms

	const autosaveStatusBox = document.createElement('div');
	autosaveStatusBox.style.position = 'fixed';
	autosaveStatusBox.style.bottom = '0';
	autosaveStatusBox.style.pointerEvents = 'none';

	editor.createHTMLOverlay(autosaveStatusBox);

	const createAutosave = async () => {
		const savedSVG = await editor.toSVGAsync({
			onProgress: async (a, b) => {
				if (a % 100 === 0) {
					// Because this code runs within a WebView, we don't have access to the
					// _ localization function and need to replace the format code manually:
					const percentComplete = `${Math.floor(a / b * 100)}`;
					autosaveStatusBox.innerText = localization.autosaving.replace('{{percent}}', percentComplete);
				}
			},
		});
		saveDrawing(savedSVG, true);
	};

	while (true) {
		autosaveStatusBox.style.display = 'none';
		await (new Promise<void>(resolve => {
			setTimeout(() => resolve(), delayTime);
		}));

		autosaveStatusBox.style.display = 'block';

		await createAutosave();
	}
};

export default startAutosaveLoop;
