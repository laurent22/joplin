import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Path from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import { Vec2 } from '../geometry/Vec2';
import AbstractRenderer, { RenderablePathSpec } from '../rendering/AbstractRenderer';
import AbstractComponent from './AbstractComponent';

interface StrokePart {
	path: RenderablePathSpec;
	bbox: Rect2;
}

export default class Stroke extends AbstractComponent {
	private geometry: Path;
	private parts: StrokePart[];
	protected contentBBox: Rect2;

	public constructor(parts: RenderablePathSpec[]) {
		super();

		// TODO: This can be optimized (Path.fromRenderable does extra work (e.g.
		// computing Bezier curves, etc.)).
		this.parts = parts.map(section => {
			return {
				path: section,
				bbox: Path.fromRenderable(section).bbox,
			};
		});

		this.geometry = this.parts.reduce((accumulator: Path, current: StrokePart) => {
			return Path.fromRenderable(current.path).union(accumulator);
		}, null)
		// If no parts, fall back to a sensible default
			?? new Path(Vec2.of(0, 0), []);
		this.contentBBox = this.geometry?.bbox ?? Rect2.empty;
	}

	public intersects(line: LineSegment2): boolean {
		return this.geometry.intersection(line).length > 0;
	}

	public getGeometry(): Path {
		return this.geometry;
	}

	public render(canvas: AbstractRenderer, visibleRect: Rect2): void {
		canvas.startObject(this.getBBox());
		for (const part of this.parts) {
			const bbox = part.bbox;
			if (bbox.intersects(visibleRect)) {
				canvas.drawPath(part.path);
			}
		}
		canvas.endObject();
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.geometry = this.geometry.transformedBy(affineTransfm);
		this.contentBBox = this.geometry.bbox;

		this.parts = this.parts.map((part) => {
			const geom = Path.fromRenderable(part.path).transformedBy(affineTransfm);
			return {
				path: geom.toRenderable(part.path.fill),
				bbox: geom.bbox,
			};
		});
	}
}
