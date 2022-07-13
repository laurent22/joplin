/**
 *
 */

import { Point2, Rect2 } from './math';
import AbstractRenderer from './rendering/AbstractRenderer';
import Color4 from './Color4';
import { ImageComponent } from './EditorImage';


export interface StrokeDataPoint {
	pos: Point2;
	width: number;
	color: Color4;
}


class Stroke implements ImageComponent {
	protected points: StrokeDataPoint[];
	protected bbox: Rect2;
	protected maxStrokeWidth: number;
	public readonly isContainer: boolean = false;

	public constructor(
		startPoint: StrokeDataPoint
	) {
		this.points = [];
		this.bbox = new Rect2(startPoint.pos.x, startPoint.pos.y, 0, 0);
		this.maxStrokeWidth = 0;
		this.addPoint(startPoint);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	public addPoint(point: StrokeDataPoint) {
		this.points.push(point);
		const pointRadius = this.getWidthAt(point, this.points.length - 1);

		// recompute bbox
		this.bbox = this.bbox.grownToPoint(point.pos, pointRadius);
	}

	/** @return the width of the stroke at a given point. Can be overridden. */
	public getWidthAt(point: StrokeDataPoint, _pointIdx: number): number {
		return point.width;
	}

	public getBoundingBox(): Rect2 {
		return this.bbox;
	}

	public render(ctx: AbstractRenderer, startingIdx: number = 0) {
		for (let i = startingIdx; i < this.points.length - 1; i += 2) {
			let exitingVec;

			if (i > 0) {
				exitingVec = this.points[i].pos.minus(this.points[i - 1].pos);
			}

			const p1 = this.points[i];
			const p3 = this.points[i + 1].pos;
			const p2 = exitingVec ? p1.pos.plus(exitingVec) : p3;
			const p4 = i + 2 < this.points.length ? this.points[i + 2] : this.points[i + 1];

			ctx.drawStyledCubicBezierCurve(p1, p2, p3, p4);
		}

		ctx.drawPoints(...this.bbox.corners);
	}
}

export default Stroke;
