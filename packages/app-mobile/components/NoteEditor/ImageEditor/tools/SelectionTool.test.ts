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

describe('SelectionTool', () => {
	const testStroke = new Stroke([
		// A filled unit square
		Path.fromString('M0,0 L1,0 L1,1 L0,1 Z').toRenderable({ color: Color4.blue }),
	]);
	const addTestStrokeCommand = new EditorImage.AddElementCommand(testStroke);

	it('selection should shrink/grow to bounding box of selected objects', () => {
		const editor = new ImageEditor(document.body, RenderingMode.DummyRenderer);
		editor.dispatch(addTestStrokeCommand);

		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(0.1, 0.1));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(0.1, 0.1));

		expect(selectionTool.getSelection().region).toMatchObject({
			x: 0,
			y: 0,
			w: 1,
			h: 1,
		});
	});
});
