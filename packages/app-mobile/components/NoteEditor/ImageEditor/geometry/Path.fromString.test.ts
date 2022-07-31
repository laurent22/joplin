// Tests to ensure that Paths can be deserialized

import Path, { PathCommandType } from './Path';
import { Vec2 } from './Vec2';

describe('Path.fromString', () => {
	it('should handle an empty path', () => {
		const path = Path.fromString('');
		expect(path.geometry.length).toBe(0);
	});

	it('should properly handle absolute moveTo commands', () => {
		const path1 = Path.fromString('M0,0');
		const path2 = Path.fromString('M 0 0');
		const path3 = Path.fromString('M 1,1M 2,2 M 3,3');

		expect(path1.parts[0]).toMatchObject({
			kind: PathCommandType.MoveTo,
			point: Vec2.zero,
		});
		expect(path2.parts).toMatchObject(path1.parts);

		expect(path3.parts).toMatchObject([
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(1, 1),
			},
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(2, 2),
			},
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(3,3),
			},
		]);
		expect(path3.startPoint).toMatchObject(Vec2.of(1, 1));
	});

	it('should properly handle relative moveTo commands', () => {
		const path = Path.fromString('m1,1  	m0,0 m   3,3');
		expect(path.parts).toMatchObject([
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(1, 1),
			},
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(1, 1),
			},
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(4, 4),
			},
		]);
	});

	it('should handle lineTo commands', () => {
		const path = Path.fromString('l1,2L-1,0l0.1,-1.0');
		expect(path.parts).toMatchObject([
			{
				kind: PathCommandType.LineTo,
				// l is a relative lineTo, but because there
				// is no previous command, it should act like an
				// absolute moveTo.
				point: Vec2.of(1, 2),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(-1, 0),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(-0.9, -1.0),
			},
		]);
	});

	it('"z" should close strokes', () => {
		const path1 = Path.fromString('m3,3 l1,2 l1,1 z');
		const path2 = Path.fromString('m3,3 l1,2 l1,1 Z');

		expect(path1.startPoint).toMatchObject(Vec2.of(3,3));
		expect(path2.startPoint).toMatchObject(path1.startPoint);
		expect(path1.parts).toMatchObject(path2.parts);
		expect(path1.parts).toMatchObject([
			{
				kind: PathCommandType.MoveTo,
				point: Vec2.of(3, 3),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(4, 5),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(5, 6),
			},
			{
				kind: PathCommandType.LineTo,
				point: path1.startPoint,
			}
		]);
	})

	it('should properly handle cubic Bézier curves', () => {
		const path = Path.fromString('c1,1 0,-3 4 5 C1,1 0.1, 0.1 0, 0');
		expect(path.parts.length).toBe(2);
		expect(path.parts).toMatchObject([
			{
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: Vec2.of(1, 1),
				controlPoint2: Vec2.of(1, -2),
				endPoint: Vec2.of(5, 3),
			},
			{
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: Vec2.of(1, 1),
				controlPoint2: Vec2.of(0.1, 0.1),
				endPoint: Vec2.zero,
			}
		]);
	});

	it('should handle quadratic Bézier curves', () => {
		const path = Path.fromString(' Q1 1,2 3 q-1 -2,-3 -4 Q 1 2,3 4');
		expect(path.parts).toMatchObject([
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(1, 1),
				endPoint: Vec2.of(2, 3),
			},
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(1, 1),
				endPoint: Vec2.of(-2, -3),
			},
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(1, 2),
				endPoint: Vec2.of(3, 4),
			},
		]);
		expect(path.startPoint).toMatchObject(Vec2.of(1, 1));
	});
});