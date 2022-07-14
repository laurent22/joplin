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
	private curveCache: Record<number, (()=> void)> = [];

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
		// Can we move the last point instead?
		if (this.points.length > 1) {
			const prevPrevPoint = this.points[this.points.length - 2];
			const prevPoint = this.points[this.points.length - 1];
			const prevDisplacement = prevPoint.pos.minus(prevPrevPoint.pos);
			const fullDisplacement = point.pos.minus(prevPrevPoint.pos);
			const prevDirectionVec = prevDisplacement.normalized();
			const directionVec = point.pos.minus(prevPoint.pos).normalized();

			if (directionVec.dot(prevDirectionVec) > 0.9
					|| fullDisplacement.magnitude() < point.width * 3) {
				prevPoint.pos = point.pos;
				prevPoint.color = point.color;
				prevPoint.width = point.width;
				this.curveCache[this.points.length - 1] = null;
				this.curveCache[this.points.length - 2] = null;
			} else {
				this.points.push(point);
			}
		} else {
			this.points.push(point);
		}

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

	public render(ctx: AbstractRenderer, visibleRegion: Rect2, startingIdx: number = 0) {
		for (let i = startingIdx; i < this.points.length; i += 2) {
			let exitingVec;

			if (i > 0) {
				exitingVec = this.points[i].pos.minus(this.points[i - 1].pos);
			}

			const p1 = this.points[i];
			const p3 = this.points[Math.min(i + 1, this.points.length - 1)].pos;
			const p2 = exitingVec ? p1.pos.plus(exitingVec) : p3;
			const p4 = this.points[Math.min(i + 2, this.points.length - 1)];

			const box = Rect2.bboxOf([p1.pos, p2, p3, p4.pos], Math.max(p1.width, p4.width));
			if (box.intersects(visibleRegion)) {
				if (this.curveCache[i] == null) {
					ctx.drawPoints(p4.pos);
					this.curveCache[i] = ctx.drawStyledCubicBezierCurve(p1, p2, p3, p4);
				} else {
					this.curveCache[i]();
				}
			}
		}

		ctx.drawPoints(...this.bbox.corners);
	}
}

export default Stroke;
