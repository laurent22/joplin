import Color4 from './Color4';
import { Bezier } from 'bezier-js';
import { FillStyle, RenderablePathSpec } from './rendering/AbstractRenderer';
import { Point2, Vec2 } from './geometry/Vec2';
import Rect2 from './geometry/Rect2';
import { PathCommand, PathCommandType } from './geometry/Path';
import LineSegment2 from './geometry/LineSegment2';
import Stroke from './components/Stroke';

export interface StrokeDataPoint {
	pos: Point2;
	width: number;
	time: number;
	color: Color4;
}

export default class StrokeBuilder {
	private segments: RenderablePathSpec[];
	private buffer: Point2[];
	private lastPoint: StrokeDataPoint;
	private lastExitingVec: Vec2;
	private currentCurve: Bezier|null = null;
	private curveStartWidth: number;
	private curveEndWidth: number;

	// Maximum distance from the actual curve (irrespective of stroke width)
	// for which a point is considered 'part of the curve'.
	// Note that the maximum will be smaller if the stroke width is less than
	// [maxFitAllowed].
	private maxFitAllowed: number;

	// Stroke smoothing and tangent approximation
	private momentum: Vec2;


	private bbox: Rect2;

	public constructor(
		private startPoint: StrokeDataPoint,
		maxFitAllowed: number
	) {
		this.lastPoint = startPoint;
		this.segments = [];
		this.buffer = [startPoint.pos];
		this.momentum = Vec2.zero;
		this.currentCurve = null;
		this.maxFitAllowed = maxFitAllowed;

		this.bbox = new Rect2(startPoint.pos.x, startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	// Get the segments that make up this' path. Can be called after calling build()
	public preview(): RenderablePathSpec[] {
		if (this.currentCurve && this.lastPoint) {
			const currentPath = this.currentSegmentToPath(this.lastPoint);
			return this.segments.concat(currentPath);
		}

		return this.segments;
	}

	public build(): Stroke {
		if (this.lastPoint) {
			this.finalizeCurrentCurve(this.lastPoint);
		}
		return new Stroke(
			this.segments
		);
	}

	private finalizeCurrentCurve(fillStyle: FillStyle) {
		// Case where no points have been added
		if (!this.currentCurve) {
			const width = this.startPoint.width / 3;

			// Draw a circle-ish shape around the start point
			this.segments.push({
				// Start on the right, cycle clockwise:
				//    |
				//  ----- ←
				//    |
				startPoint: this.startPoint.pos.plus(Vec2.of(width, 0)),
				commands: [
					{
						kind: PathCommandType.QuadraticBezierTo,
						controlPoint: this.startPoint.pos.plus(Vec2.of(width, width)),

						// Bottom of the circle
						//    |
						//  -----
						//    |
						//    ↑
						endPoint: this.startPoint.pos.plus(Vec2.of(0, width)),
					},
					{
						kind: PathCommandType.QuadraticBezierTo,
						controlPoint: this.startPoint.pos.plus(Vec2.of(-width, width)),
						endPoint: this.startPoint.pos.plus(Vec2.of(-width, 0)),
					},
					{
						kind: PathCommandType.QuadraticBezierTo,
						controlPoint: this.startPoint.pos.plus(Vec2.of(-width, -width)),
						endPoint: this.startPoint.pos.plus(Vec2.of(0, -width)),
					},
					{
						kind: PathCommandType.QuadraticBezierTo,
						controlPoint: this.startPoint.pos.plus(Vec2.of(width, -width)),
						endPoint: this.startPoint.pos.plus(Vec2.of(width, 0)),
					},
				],
				fill: fillStyle,
			});
			return;
		}

		this.segments.push(this.currentSegmentToPath(fillStyle));
		const lastPoint = this.buffer[this.buffer.length - 1];
		this.lastExitingVec = Vec2.ofXY(
			this.currentCurve.points[2]
		).minus(Vec2.ofXY(this.currentCurve.points[1]));

		// Use the last two points to start a new curve (the last point isn't used
		// in the current curve and we want connected curves to share end points)
		this.buffer = [
			this.buffer[this.buffer.length - 2], lastPoint,
		];
		this.currentCurve = null;
	}

	private currentSegmentToPath(fillStyle: FillStyle): RenderablePathSpec {
		let startVec = Vec2.ofXY(this.currentCurve.normal(0)).normalized();
		let endVec = Vec2.ofXY(this.currentCurve.normal(1)).normalized();

		startVec = startVec.times(this.curveStartWidth / 2);
		endVec = endVec.times(this.curveEndWidth / 2);

		if (isNaN(startVec.magnitude())) {
			console.error('startVec is NaN', startVec, endVec, this.currentCurve);
			console.error('startWidth:', this.curveStartWidth, 'endW:', this.curveEndWidth);
			throw new Error('ERR');
		}

		const startPt = Vec2.ofXY(this.currentCurve.get(0));
		const endPt = Vec2.ofXY(this.currentCurve.get(1));
		const controlPoint = Vec2.ofXY(this.currentCurve.points[1]);

		// Approximate the normal at the location of the control point
		const projectionT = this.currentCurve.project(controlPoint.xy).t;
		const halfVec = Vec2.ofXY(this.currentCurve.normal(projectionT))
			.normalized().times(
				this.curveStartWidth / 2 * projectionT
				+ this.curveEndWidth / 2 * (1 - projectionT)
			);

		const pathCommands: PathCommand[] = [
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: controlPoint.plus(halfVec),
				endPoint: endPt.plus(endVec),
			},

			{
				kind: PathCommandType.LineTo,
				point: endPt.minus(endVec),
			},

			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: controlPoint.minus(halfVec),
				endPoint: startPt.minus(startVec),
			},

			{
				kind: PathCommandType.LineTo,
				point: startPt.plus(startVec),
			},
		];

		return {
			startPoint: startPt.plus(startVec),
			commands: pathCommands,
			fill: fillStyle,
		};
	}

	// Compute the direction of the velocity at the end of this.buffer
	// Returns null if there aren't enough points to compute the vector
	private computeExitingVec(): Vec2|null {
		return this.momentum.normalized().times(this.lastPoint.width / 2);
	}

	public addPoint(newPoint: StrokeDataPoint) {
		if (this.lastPoint) {
			// Ignore points that are identical
			const fuzzEq = 1e-10;
			const deltaTime = newPoint.time - this.lastPoint.time;
			if (newPoint.pos.eq(this.lastPoint.pos, fuzzEq) || deltaTime === 0) {
				console.warn('Discarding identical point');
				return;
			} else if (isNaN(newPoint.pos.magnitude())) {
				console.warn('Discarding NaN point.', newPoint);
				return;
			}

			const velocity = newPoint.pos.minus(this.lastPoint.pos).times(1 / (deltaTime) * 1000);
			this.momentum = this.momentum.lerp(velocity, 0.9);
		}

		const lastPoint = this.lastPoint ?? newPoint;
		this.lastPoint = newPoint;

		this.buffer.push(newPoint.pos);
		const pointRadius = newPoint.width / 2;
		const prevEndWidth = this.curveEndWidth;
		this.curveEndWidth = pointRadius;

		// recompute bbox
		this.bbox = this.bbox.grownToPoint(newPoint.pos, pointRadius);

		if (this.currentCurve === null) {
			const p1 = lastPoint.pos;
			const p2 = lastPoint.pos.plus(this.lastExitingVec ?? Vec2.unitX);
			const p3 = newPoint.pos;

			// Quadratic Bézier curve
			this.currentCurve = new Bezier(
				p1.xy, p2.xy, p3.xy
			);
			this.curveStartWidth = lastPoint.width / 2;
		}

		let enteringVec = this.lastExitingVec;
		if (!enteringVec) {
			let sampleIdx = Math.ceil(this.buffer.length / 3);
			if (sampleIdx === 0) {
				sampleIdx = this.buffer.length - 1;
			}

			enteringVec = this.buffer[sampleIdx].minus(this.buffer[0]);
		}

		let exitingVec = this.computeExitingVec();

		// Find the intersection between the entering vector and the exiting vector
		const maxRelativeLength = 2;
		const segmentStart = this.buffer[0];
		const segmentEnd = newPoint.pos;
		const startEndDist = segmentEnd.minus(segmentStart).magnitude();
		const maxControlPointDist = maxRelativeLength * startEndDist;

		// Exit in cases where we would divide by zero
		if (maxControlPointDist === 0 || exitingVec.magnitude() === 0) {
			return;
		}

		enteringVec = enteringVec.normalized();
		exitingVec = exitingVec.normalized();

		const lineFromStart = new LineSegment2(
			segmentStart,
			segmentStart.plus(enteringVec.times(maxControlPointDist))
		);
		const lineFromEnd = new LineSegment2(
			segmentEnd.minus(exitingVec.times(maxControlPointDist)),
			segmentEnd
		);
		const intersection = lineFromEnd.intersection(lineFromStart);

		// Position the control point at this intersection
		let controlPoint: Point2;
		if (intersection) {
			controlPoint = intersection.point;
		} else {
			// Position the control point closer to the first -- the connecting
			// segment will be roughly a line.
			controlPoint = segmentStart.plus(enteringVec.times(startEndDist / 3));
		}

		if (isNaN(controlPoint.magnitude())) {
			console.error('controlPoint is NaN', intersection, 'Start:', segmentStart, 'End:', segmentEnd, 'in:', enteringVec, 'out:', exitingVec);
		}

		const prevCurve = this.currentCurve;
		this.currentCurve = new Bezier(segmentStart.xy, controlPoint.xy, segmentEnd.xy);


		// Should we start making a new curve? Check whether all buffer points are within
		// ±strokeWidth of the curve.
		const curveMatchesPoints = (curve: Bezier): boolean => {
			for (const point of this.buffer) {
				const proj =
					Vec2.ofXY(curve.project(point.xy));
				const dist = proj.minus(point).magnitude();

				if (dist > Math.min(this.curveStartWidth, this.curveEndWidth) / 2
						|| dist > this.maxFitAllowed) {
					return false;
				}
			}
			return true;
		};

		if (this.buffer.length > 3) {
			if (!curveMatchesPoints(this.currentCurve)) {
				// Use a curve that better fits the points
				this.currentCurve = prevCurve;
				this.curveEndWidth = prevEndWidth;

				// Reset the last point -- the current point was not added to the curve.
				this.lastPoint = lastPoint;

				this.finalizeCurrentCurve(lastPoint);
				return;
			}
		}
	}
}
