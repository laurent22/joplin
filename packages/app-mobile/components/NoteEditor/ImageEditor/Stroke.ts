/**
 *
 */

import { Point2, Rect2, Vec2 } from './math';
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
	private curveCache: Record<number, ((renderer: AbstractRenderer)=> void)> = [];

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
		if (this.points.length > 2) {
			const rootPoint = this.points[this.points.length - 3];
			const prevPrevPoint = this.points[this.points.length - 2];
			const prevDisplacement = prevPrevPoint.pos.minus(rootPoint.pos);
			const fullDisplacement = point.pos.minus(rootPoint.pos);
			const dist = fullDisplacement.magnitude();
			const sweep = ((fullDisplacement.angle() - prevDisplacement.angle()) % (2 * Math.PI)) * dist;

			// If the angle hasn't changed enough or the stroke isn't long enough, update the current point.
			if (Math.abs(sweep) < point.width || dist < point.width) {
				this.points[this.points.length - 1] = point;
				this.curveCache[this.points.length - 2] = null;
				this.curveCache[this.points.length - 3] = null;
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
		for (let i = startingIdx; i < this.points.length - 1; i += 2) {
			let exitingVec;

			const p1 = this.points[i];
			if (i > 0) {
				exitingVec = p1.pos.minus(this.points[i - 1].pos).normalized();
				exitingVec = exitingVec.times(this.points[i + 1].pos.minus(p1.pos).magnitude() * 0.5);
			}


			let p3, p4;
			if (i == this.points.length - 2) {
				p4 = this.points[i + 1];
				if (p4.pos.minus(p1.pos).magnitude() < p1.width) {
					p4 = {
						pos: p1.pos.plus(Vec2.unitX.times(p1.width * 2)),
						color: p4.color,
						width: p4.width,
					};
				}
				p3 = exitingVec ? p1.pos.plus(exitingVec) : p4.pos.lerp(p1.pos, 0.75);
			} else {
				p4 = this.points[i + 2];
				p3 = this.points[i + 1].pos;
			}
			const p2 = exitingVec ? p1.pos.plus(exitingVec) : p3;

			const box = Rect2.bboxOf([p1.pos, p2, p3, p4.pos], Math.max(p1.width, p4.width));
			if (box.intersects(visibleRegion)) {
				if (this.curveCache[i] == null || true) {
					this.curveCache[i] = ctx.drawStyledCubicBezierCurve(p1, p2, p3, p4);
				} else {
					this.curveCache[i](ctx);
				}
			}
		}
	}
}

export default Stroke;
