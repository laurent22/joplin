import Command from "../commands/Command";
import ImageEditor from "../editor";
import EditorImage from "../EditorImage";
import LineSegment2 from "../geometry/LineSegment2";
import Mat33 from "../geometry/Mat33";
import Rect2 from "../geometry/Rect2";
import AbstractRenderer from "../rendering/AbstractRenderer";

export default abstract class AbstractComponent {
	/**
	 * Maps from local coordinates to canvas coordinates.
	 * (i.e. applying the transformation rotates/scales, etc this
	 * for rendering.)
	 */
	protected transform: Mat33;

	protected lastChangedTime: number;
	protected abstract contentBBox: Rect2;

	protected constructor() {
		this.lastChangedTime = (new Date()).getTime();
		this.transform = Mat33.identity;
	}

	public getBBox(): Rect2 {
		return this.contentBBox.transformedBoundingBox(this.transform);
	}
	public abstract render(canvas: AbstractRenderer, visibleRect: Rect2): void;
	public abstract intersects(lineSegment: LineSegment2): boolean;

	/**
	 * Replaces the content of this with that of the given element.
	 * @returns true iff the given element was the correct type and the content of this
	 *               was replaced with the content of the given element.
	 */
	public abstract fromSVG(elem: SVGGraphicsElement): boolean;

	/** @returns a command that, when applied, transforms this by [affineTransfm]. */
	public transformBy(affineTransfm: Mat33): Command {
		const updateTransform = (editor: ImageEditor, newTransfm: Mat33) => {
			// Any parent should have only one direct child.
			const parent = editor.image.findParent(this);
			let hadParent = false;
			if (parent) {
				parent.remove();
				hadParent = true;
			}

			this.transform = newTransfm;

			// Add the element back to the document.
			if (hadParent) {
				new EditorImage.AddElementCommand(this).apply(editor);
			}
		};

		return {
			apply: (editor: ImageEditor) => {
				updateTransform(editor, this.transform.rightMul(affineTransfm));
				editor.queueRerender();
			},
			unapply: (editor: ImageEditor): void => {
				updateTransform(
					editor, this.transform.rightMul(affineTransfm.inverse())
				);
				editor.queueRerender();
			},
		};
	}
}
