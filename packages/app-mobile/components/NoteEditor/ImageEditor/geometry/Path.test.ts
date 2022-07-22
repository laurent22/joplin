import { Bezier } from 'bezier-js';
import LineSegment2 from './LineSegment2';
import Path, { PathCommandType } from './Path';
import { Vec2 } from './Vec2';

describe('Path', () => {
	it('should instantiate Beziers from cubic and quatratic commands', () => {
		const path = new Path(Vec2.zero, [
			{
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: Vec2.of(1, 1),
				controlPoint2: Vec2.of(-1, -1),
				endPoint: Vec2.of(3, 3),
			},
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(1, 1),
				endPoint: Vec2.of(0, 0),
			},
		]);

		expect(path.geometry.length).toBe(2);

		const firstItem = path.geometry[0];
		const secondItem = path.geometry[1];
		expect(firstItem).toBeInstanceOf(Bezier);
		expect(secondItem).toBeInstanceOf(Bezier);

		// Force TypeScript to do type narrowing.
		if (!(firstItem instanceof Bezier) || !(secondItem instanceof Bezier)) {
			throw new Error('Invalid state! .toBeInstanceOf should have caused test to fail!')
		}

		// Make sure the control points (and start/end points) match what was set
		expect(firstItem.points).toMatchObject([
			{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 3, y: 3 }
		]);
		expect(secondItem.points).toMatchObject([
			{ x: 3, y: 3 }, { x: 1, y: 1 }, { x: 0, y: 0 },
		])
	});

	it('should create LineSegments from line commands', () => {
		const lineStart = Vec2.zero;
		const lineEnd = Vec2.of(100, 100);

		const path = new Path(lineStart, [
			{
				kind: PathCommandType.LineTo,
				point: lineEnd,
			},
		]);

		expect(path.geometry.length).toBe(1);
		expect(path.geometry[0]).toBeInstanceOf(LineSegment2);
		expect(path.geometry[0]).toMatchObject(
			new LineSegment2(lineStart, lineEnd)
		);
	});

	it('should give all intersections for a path made up of lines', () => {
		const lineStart = Vec2.of(100, 100);
		const path = new Path(lineStart, [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(-100, 100),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(0, 0),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(100, -100),
			},
		]);

		const intersections = path.intersection(
			new LineSegment2(Vec2.of(-50, 200), Vec2.of(-50, -200))
		);

		// Should only have intersections in quadrants II and III.
		expect(intersections.length).toBe(2);

		// First intersection should be with the first curve
		const firstIntersection = intersections[0];
		expect(firstIntersection.point.xy).toMatchObject({
			x: -50,
			y: 100,
		});
		expect(firstIntersection.curve.get(firstIntersection.parameterValue)).toMatchObject({
			x: -50,
			y: 100,
		});
	});
});
