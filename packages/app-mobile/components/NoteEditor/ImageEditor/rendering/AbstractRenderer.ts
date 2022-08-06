import Color4 from '../Color4';
import Mat33 from '../geometry/Mat33';
import { PathCommand, PathCommandType } from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import Viewport from '../Viewport';

export interface FillStyle {
	color: Color4;
}

export interface RenderablePathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	fill: FillStyle;
}

export default abstract class AbstractRenderer {
	protected constructor(protected viewport: Viewport) { }

	// Returns the size of the rendered region of this on
	// the display (in pixels).
	public abstract displaySize(): Vec2;

	public abstract clear(): void;
	protected abstract beginPath(startPoint: Point2): void;
	protected abstract endPath(style: FillStyle): void;
	protected abstract lineTo(point: Point2): void;
	protected abstract traceCubicBezierCurve(
		p1: Point2, p2: Point2, p3: Point2,
	): void;
	protected abstract traceQuadraticBezierCurve(
		controlPoint: Point2, endPoint: Point2,
	): void;

	public drawPath(
		{ startPoint, commands, fill }: RenderablePathSpec, transform: Mat33 = Mat33.identity
	) {
		this.beginPath(transform.transformVec2(startPoint));

		for (const command of commands) {
			if (command.kind === PathCommandType.LineTo) {
				this.lineTo(transform.transformVec2(command.point));
			} else if (command.kind === PathCommandType.CubicBezierTo) {
				this.traceCubicBezierCurve(
					transform.transformVec2(command.controlPoint1),
					transform.transformVec2(command.controlPoint2),
					transform.transformVec2(command.endPoint)
				);
			} else if (command.kind === PathCommandType.QuadraticBezierTo) {
				this.traceQuadraticBezierCurve(
					transform.transformVec2(command.controlPoint),
					transform.transformVec2(command.endPoint)
				);
			}
		}

		this.endPath(fill);
	}

	// Draw a rectangle. Boundary lines have width [lineWidth] and are filled with [lineFill]
	public drawRect(rect: Rect2, lineWidth: number, lineFill: FillStyle): void {
		const commands: PathCommand[] = [];

		// Vector from the top left corner or bottom right corner to the edge of the
		// stroked region.
		const cornerToEdge = Vec2.of(lineWidth, lineWidth).times(0.5);
		const innerRect = Rect2.fromCorners(
			rect.topLeft.plus(cornerToEdge),
			rect.bottomRight.minus(cornerToEdge)
		);
		const outerRect = Rect2.fromCorners(
			rect.topLeft.minus(cornerToEdge),
			rect.bottomRight.plus(cornerToEdge)
		);

		const corners = [
			innerRect.corners[3],
			...innerRect.corners,
			...outerRect.corners.reverse(),
		];
		for (const corner of corners) {
			commands.push({
				kind: PathCommandType.LineTo,
				point: corner,
			});
		}

		this.drawPath({
			startPoint: outerRect.corners[3],
			commands,
			fill: lineFill,
		});
	}

	/** Debugging method */
	public abstract drawPoints(...points: Point2[]): void;
}
