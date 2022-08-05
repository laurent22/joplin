import LineSegment2 from './LineSegment2';
import { loadExpectExtensions } from '@joplin/lib/testing/test-utils';
import { Vec2 } from './Vec2';

loadExpectExtensions();

describe('Line2', () => {
	it('x and y axes should intersect at (0, 0)', () => {
		const xAxis = new LineSegment2(Vec2.of(-10, 0), Vec2.of(10, 0));
		const yAxis = new LineSegment2(Vec2.of(0, -10), Vec2.of(0, 10));
		expect(xAxis.intersection(yAxis)?.point).objEq(Vec2.zero);
		expect(yAxis.intersection(xAxis)?.point).objEq(Vec2.zero);
	});

	it('y = -2x + 2 and y = 2x - 2 should intersect at (1,0)', () => {
		// y = -2x + 2
		const line1 = new LineSegment2(Vec2.of(0, 2), Vec2.of(1, -2));
		// y = 2x - 2
		const line2 = new LineSegment2(Vec2.of(0, -2), Vec2.of(1, 2));

		expect(line1.intersection(line2)?.point).objEq(Vec2.of(1, 0));
		expect(line2.intersection(line1)?.point).objEq(Vec2.of(1, 0));
	});

	it('line from (10, 10) to (-100, 10) should intersect with the y-axis at t = 10', () => {
		const line1 = new LineSegment2(Vec2.of(10, 10), Vec2.of(-10, 10));
		// y = 2x - 2
		const line2 = new LineSegment2(Vec2.of(0, -2), Vec2.of(0, 200));

		expect(line1.intersection(line2)?.point).objEq(Vec2.of(0, 10));

		// t=10 implies 10 units along he line from (10, 10) to (-10, 10)
		expect(line1.intersection(line2)?.t).toBe(10);

		// Similarly, t = 12 implies 12 units above (0, -2) in the direction of (0, 200)
		expect(line2.intersection(line1)?.t).toBe(12);
	});

	it('y=2 and y=0 should not intersect', () => {
		const line1 = new LineSegment2(Vec2.of(-10, 2), Vec2.of(10, 2));
		const line2 = new LineSegment2(Vec2.of(-10, 0), Vec2.of(10, 0));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('x=2 and x=-1 should not intersect', () => {
		const line1 = new LineSegment2(Vec2.of(2, -10), Vec2.of(2, 10));
		const line2 = new LineSegment2(Vec2.of(-1, 10), Vec2.of(-1, -10));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('Line from (0, 0) to (1, 0) should not intersect line from (1.1, 0) to (2, 0)', () => {
		const line1 = new LineSegment2(Vec2.of(0, 0), Vec2.of(1, 0));
		const line2 = new LineSegment2(Vec2.of(1.1, 0), Vec2.of(2, 0));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('Line segment from (1, 1) to (3, 1) should have length 2', () => {
		const segment = new LineSegment2(Vec2.of(1, 1), Vec2.of(3, 1));
		expect(segment.length).toBe(2);
	});

	it('(769.612,221.037)->(770.387,224.962) should not intersect (763.359,223.667)->(763.5493, 223.667)', () => {
		// Points taken from issue observed directly in editor
		const p1 = Vec2.of(769.6126045442547, 221.037877485765);
		const p2 = Vec2.of(770.3873954557453, 224.962122514235);
		const p3 = Vec2.of( 763.3590010920082, 223.66723995850086);
		const p4 = Vec2.of(763.5494167642871, 223.66723995850086);

		const line1 = new LineSegment2(p1, p2);
		const line2 = new LineSegment2(p3, p4);
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	})
});
