import { Bezier } from 'bezier-js';
import { FillStyle, RenderablePathSpec } from '../rendering/AbstractRenderer';
import LineSegment2 from './LineSegment2';
import Mat33 from './Mat33';
import Rect2 from './Rect2';
import { Point2, Vec2 } from './Vec2';

export enum PathCommandType {
	LineTo,
	MoveTo,
	CubicBezierTo,
	QuadraticBezierTo,
}

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
		this.bbox = Rect2.bboxOf([startPoint]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(startPoint, part));
			switch (part.kind) {
			case PathCommandType.CubicBezierTo:
				this.geometry.push(
					new Bezier(
						startPoint.xy, part.controlPoint1.xy, part.controlPoint2.xy, part.endPoint.xy
					)
				);
				startPoint = part.endPoint;
				break;
			case PathCommandType.QuadraticBezierTo:
				this.geometry.push(
					new Bezier(
						startPoint.xy, part.controlPoint.xy, part.endPoint.xy
					)
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
		const points = [startPoint];
		let exhaustivenessCheck: never;
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
			exhaustivenessCheck = part;
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

					const point = Vec2.ofXY(part.get(t));

					// Ensure that the intersection is on the line
					if (point.minus(line.p1).magnitude() > line.length
							|| point.minus(line.p2).magnitude() > line.length) {
						return null;
					}

					return {
						point,
						parameterValue: t,
						curve: part,
					};
				}).filter(entry => entry !== null);
				result.push(...intersectionPoints);
			}
		}

		return result;
	}

	public transformedBy(affineTransfm: Mat33): Path {
		const startPoint = affineTransfm.transformVec2(this.startPoint);
		const newParts: PathCommand[] = [];

		let exhaustivenessCheck: never;
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
				exhaustivenessCheck = part;
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

	public toRenderable(fill: FillStyle): RenderablePathSpec {
		return {
			startPoint: this.startPoint,
			fill,
			commands: this.parts,
		};
	}

	public toString(): string {
		const result: string[] = [];

		const addCommand = (command: string, ...points: Point2[]) => {
			const pointString = points.map(point => `${point.x},${point.y}`).join(' ');
			result.push(`${command}${pointString}`);
		};

		addCommand('M', this.startPoint);
		let exhaustivenessCheck: never;
		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.MoveTo:
				addCommand('M', part.point);
				break;
			case PathCommandType.LineTo:
				addCommand('L', part.point);
				break;
			case PathCommandType.CubicBezierTo:
				addCommand('C', part.controlPoint1, part.controlPoint2, part.endPoint);
				break;
			case PathCommandType.QuadraticBezierTo:
				addCommand('Q', part.controlPoint, part.endPoint);
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
			}
		}

		return result.join('');
	}

	// Create a Path from a SVG path specification.
	// TODO: Support a larger subset of SVG paths.
	// TODO: Support h,v,s,t shorthands.
	public static fromString(pathString: string): Path {
		// See the MDN reference:
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
		// and
		// https://www.w3.org/TR/SVG2/paths.html

		// Remove linebreaks
		pathString = pathString.split('\n').join(' ');

		// TODO: Check default initializer
		let lastPos: Point2 = Vec2.zero;
		let firstPos: Point2|null = null;
		const commands: PathCommand[] = [];


		const moveTo = (point: Point2) => {
			commands.push({
				kind: PathCommandType.MoveTo,
				point,
			});
		};
		const lineTo = (point: Point2) => {
			commands.push({
				kind: PathCommandType.LineTo,
				point,
			});
		};
		const cubicBezierTo = (cp1: Point2, cp2: Point2, end: Point2) => {
			commands.push({
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: cp1,
				controlPoint2: cp2,
				endPoint: end,
			});
		};
		const quadraticBeierTo = (controlPoint: Point2, endPoint: Point2) => {
			commands.push({
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint,
				endPoint,
			});
		};

		// Each command: Command character followed by anything that isn't a command character
		const commandExp = /([MmZzLlHhVvCcSsQqTtAa])\s*([^a-zA-Z]*)/g;
		let current;
		while ((current = commandExp.exec(pathString)) !== null) {
			const commandChar = current[1];
			const argParts = current[2].trim().split(/[^0-9.-]/);

			// Convert arguments to points
			const args = argParts.filter(
				part => part.length > 0
			).reduce((accumulator: Point2[], current, index, parts): Point2[] => {
				if (index % 2 !== 0) {
					const currentAsFloat = parseFloat(current);
					const prevAsFloat = parseFloat(parts[index - 1]);
					return accumulator.concat(Vec2.of(prevAsFloat, currentAsFloat));
				} else {
					return accumulator;
				}
			}, []).map((coordinate: Vec2): Point2 => {
				const uppercaseCommand = commandChar !== commandChar.toLowerCase();

				// Lowercase commands are relative, uppercase commands use absolute
				// positioning
				if (uppercaseCommand) {
					lastPos = coordinate;
					return coordinate;
				} else {
					lastPos = lastPos.plus(coordinate);
					return lastPos;
				}
			});

			let expectedArgsCount;

			switch (commandChar.toLowerCase()) {
			case 'm':
				expectedArgsCount = 1;
				moveTo(args[0]);
				break;
			case 'l':
				expectedArgsCount = 1;
				lineTo(args[0]);
				break;
			case 'z':
				expectedArgsCount = 0;
				lineTo(firstPos);
				// TODO: Consider case where firstPos is null
				break;
			case 'c':
				expectedArgsCount = 3;
				cubicBezierTo(args[0], args[1], args[2]);
				break;
			case 'q':
				expectedArgsCount = 2;
				quadraticBeierTo(args[0], args[1]);
				break;
			default:
				throw new Error(`Unknown path command ${commandChar}`);
			}

			if (args.length !== expectedArgsCount) {
				throw new Error(`
					Incorrect number of arguments: got ${JSON.stringify(args)} with a length of ${args.length} ≠ ${expectedArgsCount}.
				`.trim());
			}

			if (args.length > 0) {
				firstPos ??= args[0];
			}
		}

		return new Path(firstPos ?? Vec2.zero, commands);
	}
}
