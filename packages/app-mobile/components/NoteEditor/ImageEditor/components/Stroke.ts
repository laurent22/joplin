import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Path from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer, { RenderablePathSpec, RenderingStyle } from '../rendering/AbstractRenderer';
import AbstractComponent from './AbstractComponent';

interface StrokePart extends RenderablePathSpec {
	path: Path;
	bbox: Rect2;
}

export default class Stroke extends AbstractComponent {
	private parts: StrokePart[];
	protected contentBBox: Rect2;

	public constructor(parts: RenderablePathSpec[]) {
		super();

		this.parts = parts.map(section => {
			const path = Path.fromRenderable(section);
			const pathBBox = this.bboxForPart(path.bbox, section.style);

			if (!this.contentBBox) {
				this.contentBBox = pathBBox;
			} else {
				this.contentBBox = this.contentBBox.union(pathBBox);
			}

			return {
				path,
				bbox: pathBBox,

				// To implement RenderablePathSpec
				startPoint: path.startPoint,
				style: section.style,
				commands: path.parts,
			};
		});
		this.contentBBox ??= Rect2.empty;
	}

	public intersects(line: LineSegment2): boolean {
		for (const part of this.parts) {
			if (part.path.intersection(line).length > 0) {
				return true;
			}
		}
		return false;
	}

	public render(canvas: AbstractRenderer, visibleRect: Rect2): void {
		canvas.startObject(this.getBBox());
		for (const part of this.parts) {
			const bbox = part.bbox;
			if (bbox.intersects(visibleRect)) {
				canvas.drawPath(part);
			}
		}
		canvas.endObject();
	}

	// Grows the bounding box for a given stroke part based on that part's style.
	private bboxForPart(origBBox: Rect2, style: RenderingStyle) {
		if (!style.stroke) {
			return origBBox;
		}

		return origBBox.grownBy(style.stroke.width / 2);
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.contentBBox = null;

		// Update each part
		this.parts = this.parts.map((part) => {
			const newPath = part.path.transformedBy(affineTransfm);
			const newBBox = this.bboxForPart(newPath.bbox, part.style);

			if (!this.contentBBox) {
				this.contentBBox = newBBox;
			} else {
				this.contentBBox = this.contentBBox.union(newBBox);
			}

			return {
				path: newPath,
				bbox: newBBox,
				startPoint: newPath.startPoint,
				commands: newPath.parts,
				style: part.style,
			};
		});

		this.contentBBox ??= Rect2.empty;
	}
}
