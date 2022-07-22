import Color4 from "./Color4";
import { Point2, Rect2, Vec2 } from "./math";
import { Bezier } from 'bezier-js';
import { FillStyle, PathCommand, PathCommandType, PathSpec } from "./rendering/AbstractRenderer";

export interface StrokeDataPoint {
	pos: Point2;
	width: number;
	color: Color4;
}

export default class StrokeBuilder {
	private segments: PathSpec[];
	private buffer: Point2[];
	private lastPoint: StrokeDataPoint;
	private exitingVec: Vec2;
	private currentCurve: Bezier|null;
	private curveStartWidth: number;
	private curveEndWidth: number;


	private bbox: Rect2;

	public constructor(
		startPoint: StrokeDataPoint
	) {
		this.lastPoint = startPoint;

		// Create a loop that surrounds the cursor.
		const p1 = startPoint.pos.minus(
			Vec2.of(startPoint.width / 2, startPoint.width / 2)
		);
		const p2 = p1.plus(Vec2.unitY.times(startPoint.width / 2));
		const p3 = p1.plus(Vec2.unitX.times(startPoint.width / 2));
		const p4 = p1;

		this.currentCurve = new Bezier(
			p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y
		);

		this.bbox = new Rect2(startPoint.pos.x, startPoint.pos.y, 0, 0);
		this.addPoint(startPoint);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	private finalizeCurrentCurve(endPoint: StrokeDataPoint) {
		this.segments.push(this.previewFinalizedCurve({
			color: endPoint.color,
		}));
		this.exitingVec = Vec2.ofXY(this.currentCurve.points[3])
				.minus(Vec2.ofXY(this.currentCurve.points[2]));
		this.currentCurve = null;
	}

	/** @return a finalized version of the current segment of the curve */
	private previewFinalizedCurve(fillStyle: FillStyle): PathSpec {
		const startVec = Vec2.ofXY(this.currentCurve.normal(0))
				.times(this.curveStartWidth * 0.5);
		const endVec = Vec2.ofXY(this.currentCurve.normal(1))
				.times(this.curveEndWidth * 0.5);
		const startPt = Vec2.ofXY(this.currentCurve.get(0));
		const endPt = Vec2.ofXY(this.currentCurve.get(1));
		const controlPoint = Vec2.ofXY(this.currentCurve.points[1]);


		const pathCommands: PathCommand[] = [
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: controlPoint.plus(startVec),
				endPoint: endPt.plus(endVec.times(2)),
			},

			{
				kind: PathCommandType.LineTo,
				point: endPt.minus(endVec),
			},

			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: controlPoint.minus(startVec),
				endPoint: endPt.minus(endVec.times(2)),
			},

			{
				kind: PathCommandType.LineTo,
				point: startPt.plus(startVec.times(2)),
			},
		];

		return {
			startPoint: startPt,
			commands: pathCommands,
			fill: fillStyle,
		}
	}

	public addPoint(newPoint: StrokeDataPoint) {
		// buffer: Points making up the pending curve
		// currentPart: "Dirty"/incomplete sequence of paths
		// pendingCurve: Curve currently under construction
		// curveStartWidth
		this.buffer.push(newPoint.pos);

		if (this.currentCurve == null) {
			const p1 = this.lastPoint.pos;
			const p2 = this.lastPoint.pos.plus(this.exitingVec);
			const p3 = newPoint.pos;

			// Quadratic Bézier curve
			this.currentCurve = new Bezier(
				p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
			);
		}

		// To check whether all buffer points are within ± strokeWidth,
		// .project each onto the curve...
		for (const point of this.buffer) {
			const proj =
				Vec2.ofXY(this.currentCurve.project(point.xy));
			const dist = proj.minus(point).magnitude();

			if (dist > this.curveStartWidth) {
				this.finalizeCurrentCurve(newPoint);
				break;
			}
		}

		const pointRadius = newPoint.width / 2;

		// recompute bbox
		this.bbox = this.bbox.grownToPoint(newPoint.pos, pointRadius);
		this.lastPoint = newPoint;
	}
}
