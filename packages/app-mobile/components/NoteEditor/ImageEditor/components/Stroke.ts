import LineSegment2 from "../geometry/LineSegment2";
import Path from "../geometry/Path";
import Rect2 from "../geometry/Rect2";
import { Vec2 } from "../geometry/Vec2";
import AbstractRenderer, { RenderablePathSpec } from "../rendering/AbstractRenderer";
import AbstractComponent from "./AbstractComponent";

interface StrokePart {
	path: RenderablePathSpec;
	bbox: Rect2;
}

export default class Stroke extends AbstractComponent {
	private readonly geometry: Path;
	private readonly parts: StrokePart[];
	protected readonly contentBBox: Rect2;

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
		return this.geometry.transformedBy(this.transform).intersection(line).length > 0;
	}

	public render(canvas: AbstractRenderer, visibleRect: Rect2): void {
		for (const part of this.parts) {
			const bbox = part.bbox.transformedBoundingBox(this.transform);
			if (bbox.intersects(visibleRect)) {
				canvas.drawPath(part.path, this.transform);
			}
		}
	}

	public fromSVG(elem: SVGGraphicsElement): boolean {
		if (elem.tagName === 'PATH') {
			//const pathData = elem.getAttribute('d');
			//const parts = pathData.split(/\s+/g);
			// TODO
		}
		throw new Error("Method not implemented.");
	}
}
