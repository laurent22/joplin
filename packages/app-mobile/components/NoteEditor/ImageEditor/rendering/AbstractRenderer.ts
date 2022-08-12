import Color4 from '../Color4';
import { PathCommand, PathCommandType } from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import Viewport from '../Viewport';

export interface RenderingStyle {
	fill: Color4;
	stroke?: {
		color: Color4;
		width: number;
	};
}

export interface RenderablePathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	style: RenderingStyle;
}

const stylesEqual = (a: RenderingStyle, b: RenderingStyle) => {
	return a === b || (a.fill.eq(b.fill)
		&& a.stroke?.color?.eq(b.stroke?.color)
		&& a.stroke?.width === b.stroke?.width);
};

export default abstract class AbstractRenderer {
	protected constructor(protected viewport: Viewport) { }

	// Returns the size of the rendered region of this on
	// the display (in pixels).
	public abstract displaySize(): Vec2;

	public abstract clear(): void;
	protected abstract beginPath(startPoint: Point2): void;
	protected abstract endPath(style: RenderingStyle): void;
	protected abstract lineTo(point: Point2): void;
	protected abstract moveTo(point: Point2): void;
	protected abstract traceCubicBezierCurve(
		p1: Point2, p2: Point2, p3: Point2,
	): void;
	protected abstract traceQuadraticBezierCurve(
		controlPoint: Point2, endPoint: Point2,
	): void;

	private objectLevel: number = 0;
	private currentPaths: RenderablePathSpec[]|null = null;
	private flushPath() {
		if (!this.currentPaths) {
			return;
		}

		let lastStyle: RenderingStyle|null = null;
		for (const path of this.currentPaths) {
			const { startPoint, commands, style } = path;

			if (!lastStyle || !stylesEqual(lastStyle, style)) {
				if (lastStyle) {
					this.endPath(lastStyle);
				}

				this.beginPath(startPoint);
				lastStyle = style;
			} else {
				this.moveTo(startPoint);
			}

			for (const command of commands) {
				if (command.kind === PathCommandType.LineTo) {
					this.lineTo(command.point);
				} else if (command.kind === PathCommandType.MoveTo) {
					this.moveTo(command.point);
				} else if (command.kind === PathCommandType.CubicBezierTo) {
					this.traceCubicBezierCurve(
						command.controlPoint1, command.controlPoint2, command.endPoint
					);
				} else if (command.kind === PathCommandType.QuadraticBezierTo) {
					this.traceQuadraticBezierCurve(
						command.controlPoint, command.endPoint
					);
				}
			}
		}

		if (lastStyle) {
			this.endPath(lastStyle);
		}
	}

	public drawPath(path: RenderablePathSpec) {
		// If we're being called outside of an object,
		// we can't delay rendering
		if (this.objectLevel === 0) {
			this.currentPaths = [path];
			this.flushPath();
			this.currentPaths = null;
		} else {
			// Otherwise, don't render paths all at once. This prevents faint lines between
			// segments of the same stroke from being visible.
			this.currentPaths.push(path);
		}
	}

	// Draw a rectangle. Boundary lines have width [lineWidth] and are filled with [lineFill]
	public drawRect(rect: Rect2, lineWidth: number, lineFill: RenderingStyle): void {
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
			style: lineFill,
		});
	}

	// Note the start/end of an object with the given bounding box.
	public startObject(_boundingBox: Rect2) {
		this.currentPaths = [];
		this.objectLevel ++;
	}
	public endObject() {
		// Render the paths all at once
		this.flushPath();
		this.currentPaths = null;
		this.objectLevel --;

		if (this.objectLevel < 0) {
			throw new Error(
				'More objects have ended than have been started (negative object nesting level)!'
			);
		}
	}

	// Draw a representation of [points]. Intended for debugging.
	public abstract drawPoints(...points: Point2[]): void;
}
