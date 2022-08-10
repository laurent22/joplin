import Command from '../commands/Command';
import SVGEditor from '../SVGEditor';
import EditorImage from '../EditorImage';
import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer from '../rendering/AbstractRenderer';

export default abstract class AbstractComponent {
	protected lastChangedTime: number;
	protected abstract contentBBox: Rect2;
	public zIndex: number;

	// Topmost z-index
	private static zIndexCounter: number = 0;

	protected constructor() {
		this.lastChangedTime = (new Date()).getTime();
		this.zIndex = AbstractComponent.zIndexCounter++;
	}

	public getBBox(): Rect2 {
		return this.contentBBox;
	}
	public abstract render(canvas: AbstractRenderer, visibleRect: Rect2): void;
	public abstract intersects(lineSegment: LineSegment2): boolean;

	// Private helper for transformBy: Apply the given transformation to all points of this.
	protected abstract applyTransformation(affineTransfm: Mat33): void;

	// Returns a command that, when applied, transforms this by [affineTransfm] and
	// updates the editor.
	public transformBy(affineTransfm: Mat33): Command {
		const updateTransform = (editor: SVGEditor, newTransfm: Mat33) => {
			// Any parent should have only one direct child.
			const parent = editor.image.findParent(this);
			let hadParent = false;
			if (parent) {
				parent.remove();
				hadParent = true;
			}

			this.applyTransformation(newTransfm);

			// Add the element back to the document.
			if (hadParent) {
				new EditorImage.AddElementCommand(this).apply(editor);
			}
		};
		const origZIndex = this.zIndex;

		return {
			apply: (editor: SVGEditor) => {
				this.zIndex = AbstractComponent.zIndexCounter++;
				updateTransform(editor, affineTransfm);
				editor.queueRerender();
			},
			unapply: (editor: SVGEditor): void => {
				this.zIndex = origZIndex;
				updateTransform(
					editor, affineTransfm.inverse()
				);
				editor.queueRerender();
			},
		};
	}
}
