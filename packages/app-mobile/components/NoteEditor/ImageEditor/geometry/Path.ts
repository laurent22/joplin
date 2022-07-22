import { Bezier } from "bezier-js";
import LineSegment2 from "./LineSegment2";
import { Point2, Vec2 } from "./Vec2";


export enum PathCommandType {
	LineTo,
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

export type PathCommand = CubicBezierPathCommand | LinePathCommand | QuadraticBezierPathCommand;

interface IntersectionResult {
	curve: LineSegment2|Bezier;
	parameterValue: number;
	point: Point2;
}

export default class Path {
	public readonly geometry: Array<LineSegment2|Bezier>;

	public constructor(startPoint: Point2, parts: PathCommand[]) {
		this.geometry = [];

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of parts) {
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
			}
		}
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
}