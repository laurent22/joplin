/** @jest-environment jsdom */

// Hide warnings from js-draw.
// jsdom doesn't support ResizeObserver and HTMLCanvasElement.getContext.
HTMLCanvasElement.prototype.getContext = () => null;
window.ResizeObserver = class { public observe() { } } as any;

import { describe, it, expect, jest } from '@jest/globals';
import { Color4, EditorImage, EditorSettings, Path, StrokeComponent } from 'js-draw';
import { RenderingMode } from 'js-draw';
import createJsDrawEditor, { ImageEditorCallbacks } from './createJsDrawEditor';


const createEditorWithCallbacks = (callbacks: Partial<ImageEditorCallbacks>) => {
	const toolbarState = '';
	const locale = 'en';

	const allCallbacks = {
		saveDrawing: () => {},
		autosaveDrawing: ()=> {},
		closeEditor: ()=> {},
		setImageHasChanges: ()=> {},

		...callbacks,
	};

	const editorOptions: Partial<EditorSettings> = {
		// Don't use a CanvasRenderer: jsdom doesn't support DrawingContext2D
		renderingMode: RenderingMode.DummyRenderer,
	};

	return createJsDrawEditor({
		close: 'Close',
		save: 'Save',
	}, allCallbacks, toolbarState, locale, editorOptions);
};

describe('createJsDrawEditor', () => {
	it('should trigger autosave callback every few minutes', () => {
		let calledAutosaveCount = 0;

		jest.useFakeTimers();
		createEditorWithCallbacks({
			autosaveDrawing: () => {
				calledAutosaveCount ++;
			},
		});

		expect(calledAutosaveCount).toBe(0);
		jest.advanceTimersByTime(1000 * 60 * 4);

		const lastAutosaveCount = calledAutosaveCount;
		expect(calledAutosaveCount).toBeGreaterThanOrEqual(1);
		expect(calledAutosaveCount).toBeLessThan(10);

		jest.advanceTimersByTime(1000 * 60 * 10);

		expect(calledAutosaveCount).toBeGreaterThan(lastAutosaveCount);
	});

	it('should fire has changes callback on first change', () => {
		let hasChanges = false;
		const editor = createEditorWithCallbacks({
			setImageHasChanges: (newHasChanges: boolean) => {
				hasChanges = newHasChanges;
			},
		});

		expect(hasChanges).toBe(false);

		const stroke = new StrokeComponent([
			// A filled shape
			Path.fromString('m0,0 l10,0 l0,10').toRenderable({ fill: Color4.red }),
		]);
		void editor.dispatch(EditorImage.addElement(stroke));

		expect(hasChanges).toBe(true);
	});
});
