
import { Editor } from 'js-draw';
import { SaveDrawingCallback } from './types';

const startAutosaveLoop = async (
	editor: Editor,
	saveDrawing: SaveDrawingCallback,
) => {
	// Autosave every two minutes.
	const delayTime = 1000 * 60 * 2; // ms

	const createAutosave = async () => {
		const savedSVG = await editor.toSVGAsync();
		saveDrawing(savedSVG.outerHTML, true);
	};

	while (true) {
		await (new Promise<void>(resolve => {
			setTimeout(() => resolve(), delayTime);
		}));

		await createAutosave();
	}
};

export default startAutosaveLoop;
