/* @jest-environment jsdom */

import EditorImage from './EditorImage';
import Stroke from './components/Stroke';
import { Vec2 } from './geometry/Vec2';
import { PathCommandType } from './geometry/Path';
import Color4 from './Color4';
import ImageEditor from './editor';
import { RenderingMode } from './Display';
import DummyRenderer from './rendering/DummyRenderer';

describe('EditorImage', () => {
	const testStroke = new Stroke([
		{
			startPoint: Vec2.of(0, 0),
			commands: [
				{
					kind: PathCommandType.MoveTo,
					point: Vec2.of(3, 3),
				},
			],
			fill: {
				color: Color4.red,
			},
		},
	]);

	it('elements added to the image should be findable', () => {
		const editor = new ImageEditor(document.body, RenderingMode.DummyRenderer);
		const image = editor.image;
		const addCommand = new EditorImage.AddElementCommand(testStroke);

		// We haven't activated the command, so testStroke's parent should be null.
		expect(image.findParent(testStroke)).toBeNull();
		addCommand.apply(editor);
		expect(image.findParent(testStroke)).not.toBeNull();
	});

	it('should render an element added to the image', () => {
		const editor = new ImageEditor(document.body, RenderingMode.DummyRenderer);
		const renderer = editor.display.getDryInkRenderer();
		if (!(renderer instanceof DummyRenderer)) {
			throw new Error('Wrong display type!');
		}

		const emptyDocumentPathCount = renderer.renderedPathCount;
		expect(renderer.objectNestingLevel).toBe(0);
		const addCommand = new EditorImage.AddElementCommand(testStroke);
		editor.dispatch(addCommand);
		editor.rerender();
		expect(renderer.renderedPathCount - emptyDocumentPathCount).toBe(1);

		// Should not be within objects after finished rendering
		expect(renderer.objectNestingLevel).toBe(0);
	});
});
