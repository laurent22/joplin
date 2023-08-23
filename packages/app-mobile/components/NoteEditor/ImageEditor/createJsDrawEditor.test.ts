/** @jest-environment jsdom */

// Hide warnings from js-draw.
// jsdom doesn't support ResizeObserver and HTMLCanvasElement.getContext.
HTMLCanvasElement.prototype.getContext = () => null;
window.ResizeObserver = class { public observe() { } } as any;

import { describe, it, expect, jest } from '@jest/globals';
import { Color4, EditorImage, EditorSettings, Path, pathToRenderable, StrokeComponent } from 'js-draw';
import { RenderingMode } from 'js-draw';
import createJsDrawEditor, { ImageEditorCallbacks, applyTemplateToEditor } from './createJsDrawEditor';
import { BackgroundComponent } from 'js-draw';
import { BackgroundComponentBackgroundType } from 'js-draw';


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

	return createJsDrawEditor(allCallbacks, toolbarState, locale, editorOptions);
};

describe('createJsDrawEditor', () => {
	it('should trigger autosave callback every few minutes', async () => {
		let calledAutosaveCount = 0;

		jest.useFakeTimers();
		createEditorWithCallbacks({
			autosaveDrawing: () => {
				calledAutosaveCount ++;
			},
		});

		expect(calledAutosaveCount).toBe(0);

		// Using the synchronous version of advanceTimersByTime seems to not
		// run the asynchronous code used to autosave drawings in createJsDrawEditor.ts.
		await jest.advanceTimersByTimeAsync(1000 * 60 * 4);

		const lastAutosaveCount = calledAutosaveCount;
		expect(calledAutosaveCount).toBeGreaterThanOrEqual(1);
		expect(calledAutosaveCount).toBeLessThan(10);

		await jest.advanceTimersByTimeAsync(1000 * 60 * 10);

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
			pathToRenderable(Path.fromString('m0,0 l10,0 l0,10'), { fill: Color4.red }),
		]);
		void editor.dispatch(EditorImage.addElement(stroke));

		expect(hasChanges).toBe(true);
	});

	it('default template should be a white grid background', async () => {
		const editor = createEditorWithCallbacks({});

		await applyTemplateToEditor(editor, '{}');

		expect(editor.image.getBackgroundComponents()).toHaveLength(1);

		// Should have a white, grid background
		const background = editor.image.getBackgroundComponents()[0] as BackgroundComponent;
		expect(editor.estimateBackgroundColor().eq(Color4.white)).toBe(true);
		expect(background.getBackgroundType()).toBe(BackgroundComponentBackgroundType.Grid);
	});
});
