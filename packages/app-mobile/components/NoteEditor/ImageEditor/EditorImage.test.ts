/* @jest-environment jsdom */

import EditorImage from './EditorImage';
import Stroke from './components/Stroke';
import { Vec2 } from './geometry/Vec2';
import Path, { PathCommandType } from './geometry/Path';
import Color4 from './Color4';
import ImageEditor from './editor';
import { RenderingMode } from './Display';
import DummyRenderer from './rendering/DummyRenderer';
import { RenderingStyle } from './rendering/AbstractRenderer';

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
			style: {
				fill: Color4.red,
			},
		},
	]);
	const testFill: RenderingStyle = { fill: Color4.black };
	const addTestStrokeCommand = new EditorImage.AddElementCommand(testStroke);

	it('elements added to the image should be findable', () => {
		const editor = new ImageEditor(document.body, RenderingMode.DummyRenderer);
		const image = editor.image;

		// We haven't activated the command, so testStroke's parent should be null.
		expect(image.findParent(testStroke)).toBeNull();
		addTestStrokeCommand.apply(editor);
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
		editor.dispatch(addTestStrokeCommand);
		editor.rerender();
		expect(renderer.renderedPathCount - emptyDocumentPathCount).toBe(1);

		// Should not be within objects after finished rendering
		expect(renderer.objectNestingLevel).toBe(0);
	});

	it('should have a 1-deep tree if two non-overlapping strokes are added', () => {
		const editor = new ImageEditor(document.body, RenderingMode.DummyRenderer);
		const image = editor.image;

		const leftmostStroke = new Stroke([
			Path.fromString('M0,0L1,1L0,1').toRenderable(testFill),
		]);

		// Lowercase ls: lineTo(Δx, Δy) instead of lineTo(x, y)
		const rightmostStroke = new Stroke([
			Path.fromString('M-10,0 l1,1 l0,-1').toRenderable(testFill),
		]);

		expect(!leftmostStroke.getBBox().intersects(rightmostStroke.getBBox()));

		(new EditorImage.AddElementCommand(leftmostStroke)).apply(editor);

		// The first node should be at the image's root.
		let firstParent = image.findParent(leftmostStroke);
		expect(firstParent).not.toBe(null);
		expect(firstParent?.getParent()).toBe(null);
		expect(firstParent?.getBBox()?.corners).toMatchObject(leftmostStroke.getBBox()?.corners);

		(new EditorImage.AddElementCommand(rightmostStroke)).apply(editor);

		firstParent = image.findParent(leftmostStroke);
		const secondParent = image.findParent(rightmostStroke);

		expect(firstParent).not.toStrictEqual(secondParent);
		expect(firstParent?.getParent()).toStrictEqual(secondParent?.getParent());
		expect(firstParent?.getParent()?.getParent()).toBeNull();
	});
});
