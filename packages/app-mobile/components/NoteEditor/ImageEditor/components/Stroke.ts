import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Path from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer, { RenderablePathSpec } from '../rendering/AbstractRenderer';
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

		// TODO: This can be optimized (Path.fromRenderable does extra work (e.g.
		// computing Bezier curves, etc.)).
		this.parts = parts.map(section => {
			const path = Path.fromRenderable(section);

			if (!this.contentBBox) {
				this.contentBBox = path.bbox;
			} else {
				this.contentBBox = this.contentBBox.union(path.bbox);
			}

			return {
				path,
				bbox: path.bbox,

				// To implement RenderablePathSpec
				startPoint: path.startPoint,
				fill: section.fill,
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

	protected applyTransformation(affineTransfm: Mat33): void {
		this.contentBBox = null;

		// Update each part
		this.parts = this.parts.map((part) => {
			const newPath = part.path.transformedBy(affineTransfm);
			const newBBox = newPath.bbox;
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
				fill: part.fill,
			};
		});

		this.contentBBox ??= Rect2.empty;
	}
}
