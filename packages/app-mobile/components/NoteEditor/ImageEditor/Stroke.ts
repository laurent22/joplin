/**
 * 
 */

import { Point2, Rect2, Vec3 } from './math';

export class StrokeDataPoint {
	constructor(
		public readonly pos: Point2, public readonly width: number,
		public readonly color: Vec3, public readonly opacity: number,
	) { }
}

/** Callback to draw a bezier curve with the given control points */
export type DrawCurveCallback =
	(p1: StrokeDataPoint, p2: StrokeDataPoint, p3: StrokeDataPoint, p4: StrokeDataPoint) => void;

class Stroke {
	protected points: StrokeDataPoint[];
	protected bbox: Rect2;
	protected maxStrokeWidth: number;

	public constructor(
			public readonly strokeSize: number,
			startPoint: StrokeDataPoint
		) {
		this.bbox = new Rect2(startPoint.pos.x, startPoint.pos.y, 0, 0);
		this.maxStrokeWidth = 0;
		this.addPoint(startPoint);
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

	public render(drawCurve: DrawCurveCallback, _startingIdx: number = 0) {
		for (let i = 0; i < this.points.length - 1; i += 2) {
			const p1 = this.points[i];
			const p2 = this.points[i + 1];
			const p3 = this.points[i + 1];
			const p4 = this.points[Math.min(i + 2, this.points.length - 1)];
			drawCurve(p1, p2, p3, p4);
		}
	}
}

export default Stroke;