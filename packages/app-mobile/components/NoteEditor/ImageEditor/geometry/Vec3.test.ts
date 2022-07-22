
import { loadExpectExtensions } from '@joplin/lib/testing/test-utils';
import Vec3 from './Vec3';

loadExpectExtensions();

describe('Vec3', () => {
	it('.xy should contain the x and y components', () => {
		const vec = Vec3.of(1, 2, 3);
		expect(vec.xy).toMatchObject({
			x: 1,
			y: 2,
		});
	});

	it('should be combinable with other vectors via .zip', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.zip(vec2, Math.min)).objEq(Vec3.zero);
		expect(vec1.zip(vec2, Math.max)).objEq(Vec3.of(1, 1, 0));
	});

	it('.cross should obey the right hand rule', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.cross(vec2)).objEq(Vec3.unitZ);
		expect(vec2.cross(vec1)).objEq(Vec3.unitZ.times(-1));
	})
});