import { Bezier } from "bezier-js";
import { RenderablePathSpec } from "../rendering/AbstractRenderer";
import LineSegment2 from "./LineSegment2";
import Mat33 from "./Mat33";
import Rect2 from "./Rect2";
import { Point2, Vec2 } from "./Vec2";


export enum PathCommandType {
	LineTo,
	MoveTo,
	CubicBezierTo,
	QuadraticBezierTo,
};

export interface CubicBezierPathCommand {
	kind: PathCommandType.CubicBezierTo;
	controlPoint1: Point2;
	controlPoint2: Point2;
	endPoint: Point2;
}

export interface QuadraticBezierPathCommand {
	kind: PathCommandType.QuadraticBezierTo;
	controlPoint: Point2;
	endPoint: Point2;
}

export interface LinePathCommand {
	kind: PathCommandType.LineTo;
	point: Point2;
}

export interface MoveToPathCommand {
	kind: PathCommandType.MoveTo;
	point: Point2;
}

export type PathCommand = CubicBezierPathCommand | LinePathCommand | QuadraticBezierPathCommand | MoveToPathCommand;

interface IntersectionResult {
	curve: LineSegment2|Bezier;
	parameterValue: number;
	point: Point2;
}

export default class Path {
	public readonly geometry: Array<LineSegment2|Bezier>;
	public readonly bbox: Rect2;

	public constructor(public readonly startPoint: Point2, public readonly parts: PathCommand[]) {
		this.geometry = [];

		// Initial bounding box contains one point: the start point.
		this.bbox = Rect2.bboxOf([ startPoint ]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(startPoint, part));
			switch (part.kind) {
				case PathCommandType.CubicBezierTo:
					this.geometry.push(
						new Bezier(
							startPoint.xy, part.controlPoint1.xy, part.controlPoint2.xy, part.endPoint.xy
						),
					);
					startPoint = part.endPoint;
					break;
				case PathCommandType.QuadraticBezierTo:
					this.geometry.push(
						new Bezier(
							startPoint.xy, part.controlPoint.xy, part.endPoint.xy,
						),
					);
					startPoint = part.endPoint;
					break;
				case PathCommandType.LineTo:
					this.geometry.push(
						new LineSegment2(startPoint, part.point)
					);
					startPoint = part.point;
					break;
				case PathCommandType.MoveTo:
					startPoint = part.point;
					break;
			}
		}
	}

	public static computeBBoxForSegment(startPoint: Point2, part: PathCommand): Rect2 {
		const points = [ startPoint ];
		switch (part.kind) {
		case PathCommandType.MoveTo:
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
	}

	public intersection(line: LineSegment2): IntersectionResult[] {
		const result: IntersectionResult[] = [];
		for (const part of this.geometry) {
			if (part instanceof LineSegment2) {
				const intersection = part.intersection(line);

				if (intersection) {
					result.push({
						curve: part,
						parameterValue: intersection.t,
						point: intersection.point,
					});
				}
			} else {
				const intersectionPoints: IntersectionResult[] = part.intersects(line).map(t => {
					// We're using the .intersects(line) function, which is documented
					// to always return numbers. However, to satisfy the type checker (and
					// possibly improperly-defined types),
					if (typeof t === 'string') {
						t = parseFloat(t);
					}

					return {
						point: Vec2.ofXY(part.get(t)),
						parameterValue: t,
						curve: part,
					};
				});
				result.push(...intersectionPoints);
			}
		}

		return result;
	}

	public transformedBy(affineTransfm: Mat33): Path {
		const startPoint = affineTransfm.transformVec2(this.startPoint);
		const newParts: PathCommand[] = [];

		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.MoveTo:
			case PathCommandType.LineTo:
				newParts.push({
					kind: part.kind,
					point: affineTransfm.transformVec2(part.point),
				});
				break;
			case PathCommandType.CubicBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint1: affineTransfm.transformVec2(part.controlPoint1),
					controlPoint2: affineTransfm.transformVec2(part.controlPoint2),
					endPoint: affineTransfm.transformVec2(part.endPoint),
				});
				break;
			case PathCommandType.QuadraticBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint: affineTransfm.transformVec2(part.controlPoint),
					endPoint: affineTransfm.transformVec2(part.endPoint),
				});
				break;
			default:
				const exhaustivenessCheck: never = part;
				return exhaustivenessCheck;
			}
		}
	
		return new Path(startPoint, newParts);
	}

	// Creates a new path by joining [other] to the end of this path
	public union(other: Path|null): Path {
		if (!other) {
			return this;
		}

		return new Path(this.startPoint, [
			...this.parts,
			{
				kind: PathCommandType.MoveTo,
				point: other.startPoint,
			},
			...other.parts,
		]);
	}

	public static fromRenderable(renderable: RenderablePathSpec): Path {
		return new Path(renderable.startPoint, renderable.commands);
	}
}
