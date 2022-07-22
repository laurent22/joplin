import Mat33 from './Mat33';
import { Vec2 } from './Vec2';
import { loadExpectExtensions } from '@joplin/lib/testing/test-utils';

loadExpectExtensions();

describe('Mat33 tests', () => {
	it('equality', () => {
		expect(Mat33.identity).objEq(Mat33.identity);
		expect(new Mat33(
			0.1, 0.2, 0.3,
			0.4, 0.5, 0.6,
			0.7, 0.8, -0.9
		)).objEq(new Mat33(
			0.2, 0.1, 0.4,
			0.5, 0.5, 0.7,
			0.7, 0.8, -0.9
		), 0.2);
	});

	it('transposition', () => {
		expect(Mat33.identity.transposed()).objEq(Mat33.identity);
		expect(new Mat33(
			1, 2, 0,
			0, 0, 0,
			0, 1, 0
		).transposed()).objEq(new Mat33(
			1, 0, 0,
			2, 0, 1,
			0, 0, 0
		));
	});

	it('multiplication', () => {
		const M = new Mat33(
			1, 2, 3,
			4, 5, 6,
			7, 8, 9
		);

		expect(Mat33.identity.rightMul(Mat33.identity)).objEq(Mat33.identity);
		expect(M.rightMul(Mat33.identity)).objEq(M);
		expect(M.rightMul(new Mat33(
			1, 0, 0,
			0, 2, 0,
			0, 0, 1
		))).objEq(new Mat33(
			1, 4, 3,
			4, 10, 6,
			7, 16, 9
		));
		expect(M.rightMul(new Mat33(
			2, 0, 1,
			0, 1, 0,
			0, 0, 3
		))).objEq(new Mat33(
			2, 2, 10,
			8, 5, 22,
			14, 8, 34
		));
	});

	it('inverse', () => {
		const fuzz = 0.01;
		expect(Mat33.identity.inverse()).objEq(Mat33.identity, fuzz);

		const M = new Mat33(
			1, 2, 3,
			4, 1, 0,
			2, 3, 0
		);
		expect(M.inverse().rightMul(M)).objEq(Mat33.identity, fuzz);
	});

	it('z-rotation', () => {
		const fuzz = 0.01;

		const M = Mat33.zRotation(Math.PI / 2);
		const rotated = M.transformVec2(Vec2.unitX);
		expect(rotated).objEq(Vec2.unitY, fuzz);
		expect(M.transformVec2(rotated)).objEq(Vec2.unitX.times(-1), fuzz);
	});

	it('Translation', () => {
		const fuzz = 0.01;

		const M = Mat33.translation(Vec2.of(1, -4));
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(1, -4), fuzz);
		expect(M.transformVec2(Vec2.of(-1, 3))).objEq(Vec2.of(0, -1), fuzz);
	});

	it('Scaling 2D', () => {
		const fuzz = 0.01;

		const center = Vec2.of(1, -4);
		const M = Mat33.scaling2D(2, center);
		expect(M.transformVec2(center)).objEq(center, fuzz);
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(-1, 4), fuzz);
	});
});