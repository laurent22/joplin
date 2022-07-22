import Color4 from '../Color4';
import { Point2, Rect2 } from '../math';
import Viewport from '../Viewport';

export interface FillStyle {
	color: Color4;
}


export const getPathSegmentBBox = (startPoint: Point2, part: PathCommand): Rect2 => {
	const points = [ startPoint ];
	switch (part.kind) {
	case PathCommandType.LineTo:
		points.push(part.point);
		break;
	case PathCommandType.CubicBezierTo:
		points.push(part.controlPoint1, part.controlPoint2, part.endPoint);
		break;
	case PathCommandType.QuadraticBezierTo:
		points.push(part.controlPoint, part.endPoint);
		break;
	default:
		const exhaustivenessCheck: never = part;
		return exhaustivenessCheck;
	}

	return Rect2.bboxOf(points);
};

export interface PathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	fill: FillStyle;
}

export const getPathBBox = (path: PathSpec): Rect2 => {
	const startPoint = path.startPoint;
	return path.commands.reduce((previous: Rect2, current: PathCommand): Rect2 => {
		// We're just computing the bounding box, so don't need to update
		// startPoint.
		return previous.union(getPathSegmentBBox(startPoint, current));
	}, Rect2.empty);
};

export default abstract class AbstractRenderer {
	protected constructor(protected viewport: Viewport) { }
	public abstract clear(): void;
	protected abstract beginPath(startPoint: Point2): void;
	protected abstract endPath(style: FillStyle): void;
	protected abstract lineTo(point: Point2): void;
	protected abstract traceCubicBezierCurve(
		p1: Point2, p2: Point2, p3: Point2
	): void;
	protected abstract traceQuadraticBezierCurve(
		controlPoint: Point2, endPoint: Point2,
	): void;

	public drawPath({ startPoint, commands, fill }: PathSpec) {
		this.beginPath(startPoint);

		for (const command of commands) {
			if (command.kind === PathCommandType.LineTo) {
				this.lineTo(command.point);
			} else if (command.kind === PathCommandType.CubicBezierTo) {
				this.traceCubicBezierCurve(
					command.controlPoint1,
					command.controlPoint2,
					command.endPoint,
				);
			} else if (command.kind === PathCommandType.QuadraticBezierTo) {
				this.traceQuadraticBezierCurve(
					command.controlPoint,
					command.endPoint,
				);
			}
		}

		this.endPath(fill);
	}

	/** Debugging method */
	public abstract drawPoints(...points: Point2[]): void;
}
