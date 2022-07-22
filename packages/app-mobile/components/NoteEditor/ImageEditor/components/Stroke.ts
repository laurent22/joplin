import { Bezier } from "bezier-js";
import { Rect2, Vec3 } from "../math";
import AbstractRenderer, { getPathBBox, PathSpec } from "../rendering/AbstractRenderer";
import AbstractComponent from "./AbstractComponent";

interface StrokePart {
	path: PathSpec;
	bbox: Rect2;
}

export default class Stroke extends AbstractComponent {
	private readonly parts: StrokePart[];
	protected readonly contentBBox: Rect2;

	public constructor(parts: PathSpec[]) {
		super();
		this.parts = parts.map(section => {
			return {
				path: section,
				bbox: getPathBBox(section),
			};
		});

		this.contentBBox = this.parts.reduce((accumulator: Rect2, current: StrokePart) => {
			return accumulator.union(current.bbox);
		}, Rect2.empty);
	}

	private bezierCurves: Bezier[]|null = null;
	public intersects(start: Vec3, displacement: Vec3): boolean {
		// Lazy-load curves
		if (!this.bezierCurves) {
			this.bezierCurves = [];
			for (const part of this.parts) {
				for (const command of part.path.commands) {
					this.bezierCurves.push(new Bezier());
				}
			}
		}
	}

	public render(canvas: AbstractRenderer, visibleRect: Rect2): void {
		for (const part of this.parts) {
			if (part.bbox.intersects(visibleRect)) {
				canvas.drawPath(part.path);
			}
		}
	}

	public fromSVG(elem: SVGGraphicsElement): boolean {
		if (elem.tagName === 'PATH') {
			const pathData = elem.getAttribute('d');
			const parts = pathData.split(/\s+/g);
			// TODO
		}
		throw new Error("Method not implemented.");
	}
}