import Path, { PathCommandType } from './Path';
import { Vec2 } from './Vec2';


describe('Path.toString', () => {
	it('a single-point path should produce a move-to command', () => {
		const path = new Path(Vec2.of(0, 0), []);
		expect(path.toString()).toBe('M0,0');
	});

	it('should convert lineTo commands to L SVG commands', () => {
		const path = new Path(Vec2.of(0.1, 0.2), [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(0.3, 0.4),
			},
		]);
		expect(path.toString()).toBe('M0.1,0.2L0.3,0.4');
	});

	it('should fix rounding errors', () => {
		const path = new Path(Vec2.of(0.100001, 0.199999), [
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(9999, -10.999999995),
				endPoint: Vec2.of(0.000300001, 1.400002),
			},
		]);
		expect(path.toString()).toBe('M0.1,0.2Q9999,-11 0.0003,1.4');
	});
});
