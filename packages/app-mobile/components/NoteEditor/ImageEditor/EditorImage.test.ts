/* @jest-environment jsdom */

import EditorImage from './EditorImage';
import Stroke from './components/Stroke';
import { Vec2 } from './geometry/Vec2';
import { PathCommandType } from './geometry/Path';
import Color4 from './Color4';
import ImageEditor from './editor';
import { RenderingMode } from './Display';

describe('EditorImage', () => {
    const testStroke = new Stroke([
        {
            startPoint: Vec2.of(0, 0),
            commands: [
                {
                    kind: PathCommandType.MoveTo,
                    point: Vec2.of(1, 1),
                }
            ],
            fill: {
                color: Color4.red,
            },
        }
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
});