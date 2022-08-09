/* @jest-environment jsdom */

import Color4 from '../Color4';
import Stroke from '../components/Stroke';
import { RenderingMode } from '../Display';
import ImageEditor from '../editor';
import EditorImage from '../EditorImage';
import Path from '../geometry/Path';
import { Vec2 } from '../geometry/Vec2';
import { InputEvtType } from '../types';
import SelectionTool from './SelectionTool';
import { ToolType } from './ToolController';

const getSelectionTool = (editor: ImageEditor): SelectionTool => {
	return editor.toolController.getMatchingTools(ToolType.Selection)[0] as SelectionTool;
};

const createEditor = () => new ImageEditor(document.body, RenderingMode.DummyRenderer);

const createSquareStroke = () => {
	const testStroke = new Stroke([
		// A filled unit square
		Path.fromString('M0,0 L1,0 L1,1 L0,1 Z').toRenderable({ fill: Color4.blue }),
	]);
	const addTestStrokeCommand = new EditorImage.AddElementCommand(testStroke);

	return { testStroke, addTestStrokeCommand };
};

describe('SelectionTool', () => {
	it('selection should shrink/grow to bounding box of selected objects', () => {
		const { addTestStrokeCommand } = createSquareStroke();

		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(0.1, 0.1));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(0.1, 0.1));

		// Should surround the selected object (which has bbox = (0, 0, 1, 1))
		// with extra space.
		const paddingSize = selectionTool.getSelection().getMinCanvasSize();
		expect(selectionTool.getSelection().region).toMatchObject({
			x: -paddingSize / 2,
			y: -paddingSize / 2,
			w: paddingSize + 1,
			h: paddingSize + 1,
		});
	});

	it('dragging the selected region should move selected items', () => {
		const { testStroke, addTestStrokeCommand } = createSquareStroke();
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		// Select the object
		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(5, 5));

		const selection = selectionTool.getSelection();
		expect(selection).not.toBeNull();

		// Drag the object
		selection.handleBackgroundDrag(Vec2.of(5, 5));
		selection.finishDragging();

		expect(testStroke.getBBox().topLeft).toMatchObject({
			x: 5,
			y: 5,
		});

		editor.history.undo();

		expect(testStroke.getBBox().topLeft).toMatchObject({
			x: 0,
			y: 0,
		});
	});
});
