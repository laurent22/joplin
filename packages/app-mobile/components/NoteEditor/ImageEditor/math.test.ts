
import { Mat33, Vec2, Rect2, SmoothFunction, CubicBezierCurve, SmoothVectorFunction, Vec3, Polynomial, Point2 } from './math';

// Custom matchers. See
// https://jestjs.io/docs/expect#expectextendmatchers
expect.extend({
	// Determine whether expected = actual based on the objects'
	// .eq methods
	objEq(actual: any, expected: any, ...eqArgs: any) {
		let pass = false;
		if (expected == null) {
			pass = actual.eq(expected, ...eqArgs);
		} else {
			pass = expected.eq(actual, ...eqArgs);
		}

		return {
			pass,
			message: () => {
				if (pass) {
					return `Expected ${expected} not to .eq ${actual}. Options(${eqArgs})`;
				}
				return `Expected ${expected} to .eq ${actual}. Options(${eqArgs})`;
			},
		};
	},
});

interface CustomMatchers<R = unknown> {
	objEq(expected: {
		eq: (other: any, ...args: any)=> boolean;
	}, ...opts: any): R;
}

declare global {
	namespace jest {
		interface Expect extends CustomMatchers {}
		interface Matchers<R> extends CustomMatchers<R> {}
		interface AsyncAsymmetricMatchers extends CustomMatchers {}
	}
}

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

describe('Vec2 tests', () => {
	it('Magnitude', () => {
		expect(Vec2.of(3, 4).magnitude()).toBe(5);
	});

	it('Addition', () => {
		expect(Vec2.of(1, 2).plus(Vec2.of(3, 4))).objEq(Vec2.of(4, 6));
	});

	it('Multiplication', () => {
		expect(Vec2.of(1, -1).times(22)).objEq(Vec2.of(22, -22));
	});

	it('More complicated expressions', () => {
		expect((Vec2.of(1, 2).plus(Vec2.of(3, 4))).times(2)).objEq(Vec2.of(8, 12));
	});

	it('Angle', () => {
		expect(Vec2.of(-1, 1).angle()).toBeCloseTo(3 * Math.PI / 4);
	});

	it('Perpindicular', () => {
		const fuzz = 0.001;
		expect(Vec2.unitX.cross(Vec3.unitZ)).objEq(Vec2.unitY.times(-1), fuzz);
	});
});

describe('Rect2 tests', () => {
	it('Positive width, height', () => {
		expect(new Rect2(-1, -2, -3, 4)).objEq(new Rect2(-4, -2, 3, 4));
		expect(new Rect2(0, 0, 0, 0).size).objEq(Vec2.zero);
		expect(Rect2.fromCorners(
			Vec2.of(-3, -3),
			Vec2.of(-1, -1)
		)).objEq(new Rect2(
			-3, -3,
			2, 2
		));
	});

	it('Bounding box', () => {
		expect(Rect2.bboxOf([
			Vec2.zero,
		])).objEq(Rect2.empty);

		expect(Rect2.bboxOf([
			Vec2.of(-1, -1),
			Vec2.of(1, 2),
			Vec2.of(3, 4),
			Vec2.of(1, -4),
		])).objEq(new Rect2(
			-1, -4,
			4, 8
		));

		expect(Rect2.bboxOf([
			Vec2.zero,
		], 10)).objEq(new Rect2(
			-10, -10,
			20, 20
		));
	});

	it('"union"ing', () => {
		expect(new Rect2(0, 0, 1, 1).union(new Rect2(1, 1, 2, 2))).objEq(
			new Rect2(0, 0, 3, 3)
		);
		expect(Rect2.empty.union(Rect2.empty)).objEq(Rect2.empty);
	});

	it('Contains', () => {
		expect(new Rect2(-1, -1, 2, 2).containsPoint(Vec2.zero)).toBe(true);
		expect(new Rect2(-1, -1, 0, 0).containsPoint(Vec2.zero)).toBe(false);
		expect(new Rect2(1, 2, 3, 4).containsRect(Rect2.empty)).toBe(false);
		expect(new Rect2(1, 2, 3, 4).containsRect(new Rect2(1, 2, 1, 2))).toBe(true);
		expect(new Rect2(-2, -2, 4, 4).containsRect(new Rect2(-1, 0, 1, 1))).toBe(true);
		expect(new Rect2(-2, -2, 4, 4).containsRect(
			new Rect2(-1, 0, 10, 1)
		)).toBe(false);
	});

	it('Intersection testing', () => {
		expect(new Rect2(-1, -1, 2, 2).intersects(Rect2.empty)).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(0, 0, 1, 1))).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(0, 0, 10, 10))).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(3, 3, 10, 10))).toBe(false);
	});

	it('Computing intersections', () => {
		expect(new Rect2(-1, -1, 2, 2).intersection(Rect2.empty)).objEq(Rect2.empty);
		expect(new Rect2(-1, -1, 2, 2).intersection(new Rect2(0, 0, 3, 3))).objEq(
			new Rect2(0, 0, 1, 1)
		);
		expect(new Rect2(-2, 0, 1, 2).intersection(new Rect2(-3, 0, 2, 2))).objEq(
			new Rect2(-2, 0, 1, 2)
		);
		expect(new Rect2(-1, -1, 2, 2).intersection(new Rect2(3, 3, 10, 10))).toBe(null);
	});

	it('A transformed bounding box', () => {
		const rotationMat = Mat33.zRotation(Math.PI / 4);
		const rect = Rect2.unitSquare.translatedBy(Vec2.of(-0.5, -0.5));
		const transformedBBox = rect.transformedBoundingBox(rotationMat);
		expect(transformedBBox.containsPoint(Vec2.of(0.5, 0.5)));
		expect(transformedBBox.containsRect(rect)).toBe(true);
	});

	describe('Grown to include a point', () => {
		it('Growing an empty rectange to include (1, 0)', () => {
			const originalRect = Rect2.empty;
			const grownRect = originalRect.grownToPoint(Vec2.unitX);
			expect(grownRect).objEq(new Rect2(0, 0, 1, 0));
		});

		it('Growing the unit rectangle to include (-5, 1), with a margin', () => {
			const originalRect = Rect2.unitSquare;
			const grownRect = originalRect.grownToPoint(Vec2.of(-5, 1), 4);
			expect(grownRect).objEq(new Rect2(-9, -3, 10, 8));
		});

		it('Growing to include a point just above', () => {
			const original = Rect2.unitSquare;
			const grown = original.grownToPoint(Vec2.of(-1, -1));
			expect(grown).objEq(new Rect2(-1, -1, 2, 2));
		});

		it('Growing to include a point just below', () => {
			const original = Rect2.unitSquare;
			const grown = original.grownToPoint(Vec2.of(2, 2));
			expect(grown).objEq(new Rect2(0, 0, 2, 2));
		});
	});
});

describe('Smooth functions', () => {
	describe('Derivatives', () => {
		describe('f(x) = x^2', () => {
			const doTests = (fn: SmoothFunction, extraDescription: string = '') => {
				it(`f'(0) ${extraDescription}`, () => {
					expect(fn.derivative.at(0)).toBeCloseTo(0);
				});

				it(`f'(1) ${extraDescription}`, () => {
					expect(fn.derivativeAt(1)).toBeCloseTo(2);
				});

				it(`f'(-100) ${extraDescription}`, () => {
					expect(fn.derivativeAt(-100)).toBeCloseTo(-200);
				});
			};

			doTests(SmoothFunction.ofFn(t => t * t), 'autodifferentiate');
			doTests(SmoothFunction.ofFn(t => t * t, t => 2 * t));
		});
	});

	describe('Absolute Minima', () => {
		it('y = x^2', () => {
			const fn = SmoothFunction.ofFn(t => t * t, t => 2 * t);
			expect(fn.minimize(-6, 1)).toBeCloseTo(0);
		});

		it('y = (x - 1)^2 - 12, auto differentiate', () => {
			const fn = SmoothFunction.ofFn(t => ((t - 1) * (t - 1) - 12));
			expect(fn.minimize(-5, 5)).toBeCloseTo(1);
		});

		it('y = x^3 + (x/2)^6 - x^23 over [-6, 6] and [-6, 1]', () => {
			const fn = SmoothFunction.ofFn(
				t => Math.pow(t, 3) + Math.pow(t / 2, 6) - Math.pow(t / 5, 23)
			);
			expect(fn.minimize(-6, 10)).toBeCloseTo(10);
			expect(fn.minimize(-6, 1)).toBeCloseTo(-3.17);
		});

		it('y = tan x over [0, 3]', () => {
			const fn = SmoothFunction.ofFn(
				t => Math.tan(t), t => (1 / Math.pow(Math.cos(t), 2))
			);
			const numDigits = 1;
			expect(fn.minimize(0, 3, 10)).toBeCloseTo(Math.PI / 2, numDigits);
		});
	});

	describe('Minima near', () => {
		it('y = x', () => {
			const fn = SmoothFunction.ofFn(t => t);
			expect(fn.minimumNear(-10, 10, 1)).toBeCloseTo(-10);
		});

		it('y = x^2', () => {
			const fn = SmoothFunction.ofFn(t => t * t, t => 2 * t);
			expect(fn.minimumNear(-1, 1, 1)).toBeCloseTo(0);
		});

		it('y = x^3', () => {
			const fn = SmoothFunction.ofFn(t => t * t * t, t => 3 * t * t);
			expect(fn.minimumNear(-1, 1, 0)).toBeCloseTo(-1);
		});
	});

	describe('Zeros', () => {
		it('f(t) = t + 1', () => {
			const fn = SmoothFunction.ofFn(t => t + 1);
			expect(fn.zeroNear(100)).toBeCloseTo(-1);
		});

		it('f(t) = tan(t)', () => {
			const fn = SmoothFunction.ofFn(t => Math.tan(t));
			expect(fn.zeroNear(0.6)).toBeCloseTo(0);
		});
	});

	describe('Taylor approx', () => {
		it('f(t) = t + 1', () => {
			const fn = SmoothFunction.ofFn(t => t + 1).taylorApproximated(2, 0);
			expect(fn.at(2)).toBeCloseTo(3);
			expect(fn.derivativeAt(0)).toBeCloseTo(1);
			expect(fn.derivativeAt(2)).toBeCloseTo(1);
		});

		it('f(t) = sin(t)', () => {
			const fuzz = 0.1;
			const fn = SmoothFunction.ofFn(t => Math.sin(t)).taylorApproximated(5, Math.PI / 4);
			expect(Math.abs(fn.at(0))).toBeLessThan(fuzz);
			expect(Math.abs(1 - fn.at(Math.PI / 2))).toBeLessThan(fuzz);
			expect(Math.abs(1 - fn.derivativeAt(0))).toBeLessThan(fuzz);
			expect(Math.abs(fn.derivativeAt(Math.PI / 2))).toBeLessThan(fuzz);
		});
	});

	describe('Vector-valued fn', () => {
		it('Evaluating a constant', () => {
			const val = SmoothVectorFunction.ofConstant(Vec2.of(1, 1));
			expect(val.at(10)).objEq(Vec2.of(1, 1));
		});
	});
});

describe('Polynomials', () => {
	it('Differentiation', () => {
		// 1 + 2t + 3t² + 4t³
		const poly = new Polynomial([ 1, 2, 3, 4 ]);
		expect(poly.derivative.toString()).toBe('2 + 6t + 12t^2');
		expect(poly.derivativeAt(0)).toBe(2);
		expect(poly.derivativeAt(1)).toBe(2 + 6 + 12);
	});
	it('Multiplication', () => {
		// 1 + 2t
		const poly = new Polynomial([ 1, 2 ]);
		expect(poly.times(poly).toString()).toBe('1 + 4t + 4t^2');
	});
});

describe('Bézier curves', () => {
	it('Evaluating', () => {
		// P₀(1 - t)³ + 3 P₁ (1 - t) t² + 3 P₂ (1 - t)² t + P₃t³
		const curve = new CubicBezierCurve(Vec2.of(0, 0), Vec2.of(1, 0), Vec2.of(0, 1), Vec2.of(1, 1));
		expect(curve.at(0).x).toBeCloseTo(0);
		expect(curve.at(0).y).toBeCloseTo(0);
		expect(curve.at(1).x).toBeCloseTo(1);
		expect(curve.at(1).y).toBeCloseTo(1);
		expect(curve.at(0.5).x).toBeCloseTo(3 * (1 - 0.5) * 0.25 + 0.5 * 0.5 * 0.5);
	});

	describe('Approximation', () => {
		const maxRuntime = 300; // ms
		it('Approximation of a line', () => {
			const fuzz = 0.01;
			const points = [Vec2.of(0, 0), Vec2.of(1, 1), Vec2.of(2, 2), Vec2.of(3, 3)];

			const startTime = (new Date()).getTime();

			const { curve } = CubicBezierCurve.approximationOf(points);
			expect(curve.at(0.5).normalized()).objEq(Vec2.of(0.5, 0.5).normalized(), fuzz);
			expect(curve.at(0)).objEq(Vec2.of(0, 0), fuzz);
			expect(curve.at(1)).objEq(Vec2.of(3, 3), fuzz);
			//expect(error).toBeLessThan(fuzz);

			// Should be reasonably fast (ideally < 30ms)
			expect((new Date()).getTime() - startTime).toBeLessThan(maxRuntime);
		});

		it('Approximation of a quadratic', () => {
			const fuzz = 0.01;
			const points: Point2[] = [ ];
			for (let i = 0; i < 200; i++) {
				let t = i / 10;
				points.push(Vec2.of(t, t * t));
			}
			const startTime = (new Date()).getTime();
			const { curve } = CubicBezierCurve.approximationOf(points);
			expect(curve.at(0)).objEq(Vec2.of(0, 0), fuzz);
			//expect(curve.at(0.5)).objEq(Vec2.of(1, 10), fuzz);
			//expect(error).toBeLessThan(fuzz);
			expect((new Date()).getTime() - startTime).toBeLessThan(maxRuntime);
		});
	});
});

