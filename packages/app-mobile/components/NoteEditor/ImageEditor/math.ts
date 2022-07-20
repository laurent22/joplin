/**
 * A minimalistic set of mathematical utilities.
 * As this grows, it may make sense to replace much of its
 * functionality with a library like MathJS.
 */

/**
 * A vector with three components (x, y, z). This can also be used to
 * represent a two-component vector.
 */
export class Vec3 {
	private constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number
	) {
	}

	public static of(x: number, y: number, z: number): Vec3 {
		return new Vec3(x, y, z);
	}

	/** @return the [idx]th component of this. */
	public at(idx: number): number {
		if (idx == 0) return this.x;
		if (idx == 1) return this.y;
		if (idx == 2) return this.z;

		throw new Error(`${idx} out of bounds!`);
	}

	/** @return the L2 norm of this */
	public magnitude(): number {
		return Math.sqrt(this.dot(this));
	}

	/**
	 * @return this vector's angle in the XY plane (treats this as a Vec2).
	 *         The angle is in radians and is measured counterclockwise.
	 */
	public angle(): number {
		return Math.atan2(this.y, this.x);
	}

	public normalized(): Vec3 {
		const norm = this.magnitude();
		return Vec3.of(this.x / norm, this.y / norm, this.z / norm);
	}

	public times(c: number): Vec3 {
		return Vec3.of(this.x * c, this.y * c, this.z * c);
	}

	public plus(v: Vec3): Vec3 {
		return Vec3.of(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	public minus(v: Vec3): Vec3 {
		return this.plus(v.times(-1));
	}

	public dot(other: Vec3): number {
		return this.x * other.x + this.y * other.y + this.z * other.z;
	}

	public cross(other: Vec3): Vec3 {
		// | i  j  k |
		// | x1 y1 z1| = (i)(y1z2 - y2z1) - (j)(x1z2 - x2z1) + (k)(x1y2 - x2y1)
		// | x2 y2 z2|
		return Vec3.of(
			this.y * other.z - other.y * this.z,
			other.x * this.z - this.x * other.z,
			this.x * other.y - other.x * this.y
		);
	}

	/** @return this + direction.normalized() * distance */
	public extend(distance: number, direction: Vec3): Vec3 {
		return this.plus(direction.normalized().times(distance));
	}

	/** @return a vector [fractionTo] of the way to target from this. */
	public lerp(target: Vec3, fractionTo: number): Vec3 {
		return this.times(1 - fractionTo).plus(target.times(fractionTo));
	}

	/**
	 * @param zip Maps a component of this and a corresponding component of
	 *            [other] to a component of the output vector.
	 */
	public zip(
		other: Vec3, zip: (componentInThis: number, componentInOther: number)=> number
	): Vec3 {
		return Vec3.of(
			zip(other.x, this.x),
			zip(other.y, this.y),
			zip(other.z, this.z)
		);
	}

	/**
	 * @return each component of this mapped to a new component by [fn]
	 */
	public map(fn: (component: number)=> number): Vec3 {
		return Vec3.of(
			fn(this.x), fn(this.y), fn(this.z)
		);
	}

	public asArray(): number[] {
		return [this.x, this.y, this.z];
	}

	/**
	 * @return true iff each component of this is equal to the corresponding
	 * 				component of [other]
	 */
	public eq(other: Vec3, fuzz: number): boolean {
		for (let i = 0; i < 3; i++) {
			if (Math.abs(other.at(i) - this.at(i)) > fuzz) {
				return false;
			}
		}

		return true;
	}

	public toString(): string {
		return `Vec(${this.x}, ${this.y}, ${this.z})`;
	}


	public static unitX = Vec3.of(1, 0, 0);
	public static unitY = Vec3.of(0, 1, 0);
	public static unitZ = Vec3.of(0, 0, 1);
	public static zero = Vec3.of(0, 0, 0);
}

export namespace Vec2 {
	export const of = (x: number, y: number): Vec2 => {
		return Vec3.of(x, y, 0);
	};

	export const unitX = Vec2.of(1, 0);
	export const unitY = Vec2.of(0, 1);
	export const zero = Vec2.of(0, 0);
}

export type Point2 = Vec3;
export type Vec2 = Vec3; // eslint-disable-line

/** Represents a line segment in ℝ². */
export interface LineSegment {
	origin: Point2;
	size: Vec2;
}

/**
 * Represents a three dimensional linear transformation or
 * a two-dimensional affine transformation.
 */
export class Mat33 {
	private readonly rows: Vec3[];

	public constructor(
		public readonly a1: number,
		public readonly a2: number,
		public readonly a3: number,

		public readonly b1: number,
		public readonly b2: number,
		public readonly b3: number,

		public readonly c1: number,
		public readonly c2: number,
		public readonly c3: number
	) {
		this.rows = [
			Vec3.of(a1, a2, a3),
			Vec3.of(b1, b2, b3),
			Vec3.of(c1, c2, c3),
		];
	}

	public static ofRows(r1: Vec3, r2: Vec3, r3: Vec3): Mat33 {
		return new Mat33(
			r1.x, r1.y, r1.z,
			r2.x, r2.y, r2.z,
			r3.x, r3.y, r3.z
		);
	}

	public static identity = new Mat33(
		1, 0, 0,
		0, 1, 0,
		0, 0, 1
	);

	public inverse(): Mat33 {
		const toIdentity = [
			this.rows[0],
			this.rows[1],
			this.rows[2],
		];

		const toResult = [
			Vec3.unitX,
			Vec3.unitY,
			Vec3.unitZ,
		];

		// Convert toIdentity to the identity matrix and
		// toResult to the inverse through elementary row operations
		for (let cursor = 0; cursor < 3; cursor++) {
			// Make toIdentity[k = cursor] = 1
			let scale = 1.0 / (toIdentity[cursor].at(cursor) || 1);
			toIdentity[cursor] = toIdentity[cursor].times(scale);
			toResult[cursor] = toResult[cursor].times(scale);

			// Make toIdentity[k ≠ cursor] = 0
			for (let i = 1; i <= 2; i++) {
				const otherRowIdx = (cursor + i) % 3;
				scale = -toIdentity[otherRowIdx].at(cursor);
				toIdentity[otherRowIdx] = toIdentity[otherRowIdx].plus(
					toIdentity[cursor].times(scale)
				);
				toResult[otherRowIdx] = toResult[otherRowIdx].plus(
					toResult[cursor].times(scale)
				);
			}
		}

		return Mat33.ofRows(
			toResult[0],
			toResult[1],
			toResult[2]
		);
	}

	/** @return thisᵀ */
	public transposed(): Mat33 {
		return new Mat33(
			this.a1, this.b1, this.c1,
			this.a2, this.b2, this.c2,
			this.a3, this.b3, this.c3
		);
	}

	/** @return (this)(other) */
	public rightMul(other: Mat33): Mat33 {
		other = other.transposed();

		const at = (row: number, col: number): number => {
			return this.rows[row].dot(other.rows[col]);
		};

		return new Mat33(
			at(0, 0), at(0, 1), at(0, 2),
			at(1, 0), at(1, 1), at(1, 2),
			at(2, 0), at(2, 1), at(2, 2)
		);
	}

	/**
	 * Treat the given vector like a Vec2. Applies this as an affine transformation
	 * to the given vector.
	 *
	 * @return the transformed vector.
	 */
	public transformVec2(other: Vec3): Vec2 {
		// When transforming a Vec2, we want to use the z transformation
		// components of this for translation:
		//  ⎡ . . tX ⎤
		//  ⎢ . . tY ⎥
		//  ⎣ 0 0 1  ⎦
		// For this, we need other's z component to be 1 (so that tX and tY
		// are scaled by 1):
		let intermediate = Vec3.of(other.x, other.y, 1);
		intermediate = this.transformVec3(intermediate);

		// Drop the z=1 to allow magnitude to work as expected
		return Vec2.of(intermediate.x, intermediate.y);
	}

	/** @returns the right multiplication of this with other */
	public transformVec3(other: Vec3): Vec3 {
		return Vec3.of(
			this.rows[0].dot(other),
			this.rows[1].dot(other),
			this.rows[2].dot(other)
		);
	}

	/** @returns true iff this = other ± fuzz */
	public eq(other: Mat33, fuzz: number = 0): boolean {
		for (let i = 0; i < 3; i++) {
			if (!this.rows[i].eq(other.rows[i], fuzz)) {
				return false;
			}
		}

		return true;
	}

	public toString(): string {
		return `
⎡ ${this.a1},\t ${this.a2},\t ${this.a3}\t ⎤
⎢ ${this.b1},\t ${this.b2},\t ${this.b3}\t ⎥
⎣ ${this.c1},\t ${this.c2},\t ${this.c3}\t ⎦
		`.trimRight();
	}

	/**
	 * @return a 1D array where [0] corresponds to the
	 * top-left element, [1] corresponds to the element
	 * at [0,1] (row zero, column 1) and [5] corresponds
	 * to the element at [1,2].
	 */
	public toArray(): number[] {
		return [
			this.a1, this.a2, this.a3,
			this.b1, this.b2, this.b3,
			this.c1, this.c2, this.c3,
		];
	}

	/**
	 * @return a 3x3 translation matrix. When transforming a Vec2,
	 *    that Vec2 will be translated by [amount].
	 */
	public static translation(amount: Vec2): Mat33 {
		// When transforming Vec2s by a 3x3 matrix, we give the input
		// Vec2s z = 1. As such,
		//   outVec2.x = inVec2.x * 1 + inVec2.y * 0 + 1 * amount.x
		//   ...
		return new Mat33(
			1, 0, amount.x,
			0, 1, amount.y,
			0, 0, 1
		);
	}

	/**
	 * @return a rotation matrix that rotates [radians] about the
	 *     z-axis.
	 */
	public static zRotation(radians: number, center: Point2 = Vec2.zero): Mat33 {
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);

		// Translate everything so that rotation is about the origin
		let result = Mat33.translation(center);

		result = result.rightMul(new Mat33(
			cos, -sin, 0,
			sin, cos, 0,
			0, 0, 1
		));
		return result.rightMul(Mat33.translation(center.times(-1)));
	}

	/** @return a transform that scales X and Y by [amount] */
	public static scaling2D(amount: number, center: Point2 = Vec2.zero): Mat33 {
		let result = Mat33.translation(center);

		result = result.rightMul(new Mat33(
			amount, 0, 0,
			0, amount, 0,
			0, 0, 1
		));

		// Translate such that [center] goes to (0, 0)
		return result.rightMul(Mat33.translation(center.times(-1)));
	}
}

/**
 * Represents a rectangle.
 *
 * invariant: w > 0, h > 0.
 */
export class Rect2 {
	// Derived state:
	
	// topLeft assumes up is -y
	public readonly topLeft: Point2;
	public readonly size: Vec2;
	public readonly bottomRight: Point2;
	public readonly center: Point2;
	public readonly area: number;

	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly w: number,
		public readonly h: number
	) {
		if (w < 0) {
			this.x += w;
			this.w = Math.abs(w);
		}

		if (h < 0) {
			this.y += h;
			this.h = Math.abs(h);
		}

		// Precompute/store vector forms.
		this.topLeft = Vec2.of(this.x, this.y);
		this.size = Vec2.of(this.w, this.h);
		this.bottomRight = this.topLeft.plus(this.size);
		this.center = this.topLeft.plus(this.size.times(0.5));
		this.area = this.w * this.h;
	}

	public translatedBy(vec: Vec2): Rect2 {
		return new Rect2(vec.x + this.x, vec.y + this.y, this.w, this.h);
	}

	public resizedTo(size: Vec2): Rect2 {
		return new Rect2(this.x, this.y, size.x, size.y);
	}

	public containsPoint(other: Point2): boolean {
		return this.x <= other.x && this.y <= other.y
			&& this.x + this.w >= other.x && this.y + this.h >= other.y;
	}

	public containsRect(other: Rect2): boolean {
		return this.x <= other.x && this.y <= other.y
				&& this.bottomRight.x >= other.bottomRight.x
				&& this.bottomRight.y >= other.bottomRight.y;
	}

	public intersects(other: Rect2): boolean {
		return this.intersection(other) != null;
	}

	/**
	 * @return the overlap of this and [other], or null, if no such
	 *         overlap exists
	 */
	public intersection(other: Rect2): Rect2|null {
		const topLeft = this.topLeft.zip(other.topLeft, Math.max);
		const bottomRight = this.bottomRight.zip(other.bottomRight, Math.min);

		// The intersection can't be outside of this rectangle
		if (!this.containsPoint(topLeft) || !this.containsPoint(bottomRight)) {
			return null;
		} else if (!other.containsPoint(topLeft) || !other.containsPoint(bottomRight)) {
			return null;
		}

		return Rect2.fromCorners(topLeft, bottomRight);
	}

	/** @return a new rectangle containing both [this] and [other]. */
	public union(other: Rect2): Rect2 {
		const topLeft = this.topLeft.zip(other.topLeft, Math.min);
		const bottomRight = this.bottomRight.zip(other.bottomRight, Math.max);

		return Rect2.fromCorners(
			topLeft,
			bottomRight
		);
	}

	/**
	 * @param margin The minimum distance between the new point and the edge
	 *               of the resultant rectangle.
	 * @return a new rectangle that contains this and the given point.
	 */
	public grownToPoint(point: Point2, margin: number = 0): Rect2 {
		const otherRect = new Rect2(
			point.x - margin, point.y - margin,
			margin * 2, margin * 2
		);
		return this.union(otherRect);
	}

	public get corners(): Point2[] {
		return [
			this.bottomRight,
			this.bottomRight.plus(Vec2.of(0, -this.h)),
			this.topLeft,
			this.topLeft.plus(Vec2.of(0, this.h)),
		];
	}

	public get maxDimension(): number {
		return Math.max(this.w, this.h);
	}

	/**
	 * @param affineTransform A transformation matrix to be interpreted as an affine
	 *                        transformation.
	 * @return the bounding box of this' four corners after transformed by
	 *         the given affine transformation.
	 */
	public transformedBoundingBox(affineTransform: Mat33): Rect2 {
		return Rect2.bboxOf(this.corners.map(corner => affineTransform.transformVec2(corner)));
	}

	/** @return true iff this is equal to [other] ± fuzz */
	public eq(other: Rect2, fuzz: number = 0): boolean {
		return this.topLeft.eq(other.topLeft, fuzz) && this.size.eq(other.size, fuzz);
	}

	public toString(): string {
		return `Rect(point(${this.x}, ${this.y}), size(${this.w}, ${this.h}))`;
	}


	public static fromCorners(corner1: Point2, corner2: Point2) {
		return new Rect2(
			Math.min(corner1.x, corner2.x),
			Math.min(corner1.y, corner2.y),
			Math.abs(corner1.x - corner2.x),
			Math.abs(corner1.y - corner2.y)
		);
	}

	/**
	 * @return a box that contains all points in [points] with at least
	 *         [margin] between each point and the edge of the box.
	 */
	public static bboxOf(points: Point2[], margin: number = 0) {
		let minX = 0;
		let minY = 0;
		let maxX = 0;
		let maxY = 0;
		let isFirst = true;

		for (const point of points) {
			if (isFirst) {
				minX = point.x;
				minY = point.y;
				maxX = point.x;
				maxY = point.y;

				isFirst = false;
			}

			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return Rect2.fromCorners(
			Vec2.of(minX - margin, minY - margin),
			Vec2.of(maxX + margin, maxY + margin)
		);
	}


	public static empty = new Rect2(0, 0, 0, 0);
	public static unitSquare = new Rect2(0, 0, 1, 1);
}

/**
 * Represents a function with a derivative that can be taken/approximated.
 *
 * Implementers can override [derivativeAt] for more efficient derivative
 * computation.
 */
export abstract class SmoothFunction {
	// Δt used for approximating the derivative of this and for small
	// changes in t.
	protected readonly derivativeDelta: number = 0.001;


	/** Evaluate at a point */
	public abstract at(t: number): number;

	/**
	 * If f(t) ≝ this.at(t) and g(t) ≝ other.at(t), returns
	 *     h(t) = f(t) + g(t)
	 *
	 * @return Returns (this + other)(t)
	 */
	public plus(other: SmoothFunction): SmoothFunction {
		return SmoothFunction.ofFn(
			t => this.at(t) + other.at(t),
			t => this.derivativeAt(t) + other.derivativeAt(t)
		);
	}

	/** @see plus */
	public minus(other: SmoothFunction): SmoothFunction {
		return this.plus(other.times(-1));
	}

	/**
	 * @return f(t) = this(t) * other(t)
	 */
	public times(other: number|SmoothFunction): SmoothFunction {
		if (typeof other == 'number') {
			return this.timesConstant(other);
		} else {
			return SmoothFunction.ofFn(
				t => this.at(t) * other.at(t),
				t => this.derivativeAt(t) * other.at(t) + this.at(t) * other.derivativeAt(t)
			);
		}
	}

	/**
	 * @return f(t) = [scalar] * this.at(t)
	 */
	public timesConstant(scalar: number): SmoothFunction {
		return SmoothFunction.ofFn(
			t => this.at(t) * scalar,
			t => this.derivativeAt(t) * scalar
		);
	}

	/** @return the derivative of this at [t]. */
	public derivativeAt(t: number) {
		return this.approximateDerivativeAt(t);
	}

	/** @return an approximation of the derivative of this at [t]. */
	public approximateDerivativeAt(t: number): number {
		// TODO: Optimize using https://math.stackexchange.com/a/1503003
		const delta = this.derivativeDelta / 2;
		const dy = this.at(t + delta) - this.at(t - delta);
		const dt = 2 * delta;
		return dy / dt;
	}

	/**
	 * @return a function that computes the derivative of this.
	 */
	public get derivative(): SmoothFunction {
		const original = this;

		return new (class extends SmoothFunction {
			public at(t: number): number {
				return original.derivativeAt(t);
			}
		})();
	}

	/**
	 * Approximates a zero near the given input.
	 *
	 * @param t Starting value/a guess
	 * @param threshold A number, if within, an output value is assumed to be zero
	 * @param maxSteps Maximum number of algorithm steps
	 * @return an input, which produces a value near zero. If no such input is found,
	 *         output is the initial value.
	 */
	public zeroNear(startingT: number, threshold: number = 0.001, maxSteps: number = 100): number {
		// Small number used for gradient stepping (not quite gradient descent)
		const gradientStepDelta = 0.01;
		let current = startingT;

		// Returns the absolute value of the measurement nearest zero and
		// updates current to the corresponding element of possibleTs
		const updateWithBestOf = (...possibleTs: number[]) => {
			let best = this.at(current);

			for (const t of possibleTs) {
				if (!isNaN(t)) {
					const test = Math.abs(this.at(t));

					if (test <= best) {
						current = t;
						best = test;
					}
				}
			}

			return best;
		};

		for (let i = 0; i < maxSteps; i++) {
			const slope = this.derivativeAt(current);
			const val = this.at(current);

			let nextNewtons = NaN;
			let nextGradientStep = NaN;
			const nextRandomStep = (Math.random() - 0.5) * this.derivativeDelta;

			if (slope != 0) {
				// Solve 0 = f'(γ) t + f(γ) for t
				nextNewtons = -val / slope;

				// Small step in the direction of the zero (calculated because it's cheap
				// and might work in cases where Newton's method diverges)
				nextGradientStep = current - Math.sign(val) * slope * gradientStepDelta;
			}

			// Update [current] and get the best abs(val) so far
			const absVal = updateWithBestOf(nextNewtons, nextGradientStep, nextRandomStep);

			// Can we stop early?
			if (absVal < threshold) {
				return current;
			}
		}

		return current;
	}

	/**
	 * @param minT minimum input to test
	 * @param maxT maximum input to test
	 * @param guess A value of t for which this.at(t) is near the minimum, must be within minT, maxT
	 * @param maxIterations Maximum number of iterations of the algorithm
	 * @param threshold Numbers whose absolute values are smaller than this are considered the same.
	 * @return an approximation of the t at which this(t) is minimized
	 */
	public minimumNear(
		minT: number, maxT: number, guess: number,
		maxIterations: number = 10, threshold: number = 0.005
	): number {
		// Ensure maxT > minT
		if (maxT < minT) {
			const tmp = minT;
			minT = maxT;
			maxT = tmp;
		}

		let current = Math.min(Math.max(minT, guess), maxT);
		let prev = current;
		let prevVal;
		let lastWasOvershoot = false;
		let stepSize = 1;

		for (let i = 0; i < maxIterations; i++) {
			const slope = this.derivativeAt(current);
			const currentVal = this.at(current);

			// If the previous was better...
			if (prevVal <= currentVal) {
				if (lastWasOvershoot) {
					// If we overshoot more than once in a row, halve the step size
					// to get closer to the minimum
					stepSize /= 2;
				}

				lastWasOvershoot = true;
				current = prev;
			} else {
				lastWasOvershoot = false;
				prev = current;
				prevVal = currentVal;

				// Check if we can stop early
				if (Math.abs(slope * stepSize) < threshold) {
					if (this.at(current - stepSize) < currentVal) {
						current -= stepSize;
					} else if (this.at(current + stepSize) < currentVal) {
						current += stepSize;
					} else {
						break;
					}
				} else {
					// Slightly increase the step size
					stepSize *= 1 + 1 / (i + 1);
				}
			}

			// Step towards the minimum
			current -= slope * stepSize;

			if (current < minT) {
				current = minT;
				stepSize /= 2;
			} else if (current > maxT) {
				current = maxT;
				stepSize /= 2;
			}
		}

		return current;
	}

	/**
	 * @return an approximation of the minimum value of this in the given range
	 * @param minT Minimum input value to test
	 * @param maxT Maximum input value to test
	 * @param initialGuessCount Number of initial guesses for which to start gradient descent
	 * @param maxIterationsEach Maximum number of iterations of the algorithm
	 * @param threshold Consider numbers smaller than this to be zero
	 */
	public minimize(
		minT: number, maxT: number, initialGuessCount: number = 5, maxIterationsEach: number = 10,
		threshold: number = 0.005
	): number {
		if (minT > maxT) {
			const tmp = maxT;
			maxT = minT;
			minT = tmp;
		}

		const step = (maxT - minT) / initialGuessCount;
		let minSoFar = this.at(minT);
		let inputForMin = minT;

		const testInput = (input: number) => {
			if (input > maxT || input < minT) {
				return;
			}

			const value = this.at(input);
			if (value < minSoFar) {
				minSoFar = value;
				inputForMin = input;
			}
		};

		// Create slices, find the minimum on each
		for (let t = minT; t < maxT; t += step) {
			const guess = t + step;
			const steppedInput = this.minimumNear(
				t, t + step, guess, maxIterationsEach, threshold
			);
			testInput(steppedInput);
		}

		// Try to get additional precision
		const newtonMethodSteps = 2;
		testInput(this.derivative.zeroNear(inputForMin, threshold, newtonMethodSteps));

		return inputForMin;
	}

	public taylorApproximated(numTerms: number, center: number): SmoothFunction {
		const functionVals: number[] = [];
		let current: SmoothFunction = this;
		for (let i = 0; i < numTerms; i++) {
			functionVals.push(current.at(center));
			current = current.derivative;
		}

		return new (class extends SmoothFunction {
			public at(t: number): number {
				t -= center;

				let res = 0;
				let tPow = 1;
				let fact = 1;

				for (let i = 0; i < functionVals.length; i++) {
					res += functionVals[i] * tPow / fact;
					tPow *= t;
					fact *= i + 1;
				}

				return res;
			}

			public derivativeAt(t: number): number {
				t -= center;

				let res = 0;
				let tPow = 1;
				let fact = 1;

				for (let i = 1; i < functionVals.length; i++) {
					res += i * tPow * functionVals[i] / fact;
					tPow *= t;
					fact *= i + 1;
				}

				return res;
			}
		});
	}

	/**
	 * Returns a representation of a piecewise smooth function
	 *
	 * @param f Function to implement
	 * @param df Derivative of that function (if not given, it will be approximated)
	 */
	public static ofFn(f: (t: number)=> number, df?: (t: number)=> number): SmoothFunction {
		return new (class extends SmoothFunction {
			public at(t: number): number {
				return f(t);
			}

			public derivativeAt(t: number): number {
				if (df) {
					return df(t);
				} else {
					return this.approximateDerivativeAt(t);
				}
			}
		})();
	}

	public static ofConstant(k: number): SmoothFunction {
		// Return a Polynomial to allow more efficient polynomial/constant math.
		return new Polynomial([ k ]);
	}
}

export class Polynomial extends SmoothFunction {
	private readonly derivativeCoefficients: number[];

	// Lazy load derivativeFn to prevent infinite recursion.
	private derivativeFn: SmoothFunction|null;

	/**
	 * @param coefficients Terms of the polynomial. The first is a constant, the second
	 *                     multiplies t, the third, t², ...
	 */
	public constructor(private readonly coefficients: number[]) {
		super();
		this.derivativeCoefficients = [];

		for (let i = 1; i < coefficients.length; i++) {
			this.derivativeCoefficients.push(coefficients[i] * i);
		}
	}

	public at(t: number): number {
		let result = 0;
		let tPower = 1;
		for (let i = 0; i < this.coefficients.length; i++) {
			result += this.coefficients[i] * tPower;
			tPower *= t;
		}

		return result;
	}

	public get derivative(): SmoothFunction {
		if (this.derivativeFn != null) {
			return this.derivativeFn;
		} else if (this.derivativeCoefficients.length <= 1) {
			this.derivativeFn = SmoothFunction.ofConstant(
				this.derivativeCoefficients.length < 1 ? 0 : this.derivativeCoefficients[0]
			);
		} else {
			this.derivativeFn = new Polynomial(this.derivativeCoefficients);
		}

		return this.derivativeFn;
	}

	public derivativeAt(t: number): number {
		let result = 0;
		let tPower = 1;
		for (let i = 0; i < this.derivativeCoefficients.length; i++) {
			result += this.derivativeCoefficients[i] * tPower;
			tPower *= t;
		}
		return result;
	}

	public plus(other: SmoothFunction): SmoothFunction {
		if (other instanceof Polynomial) {
			const newCoefficients = [];
			for (let i = 0; i < other.coefficients.length; i++) {
				newCoefficients.push(this.coefficients[i] + other.coefficients[i]);
			}

			return new Polynomial(newCoefficients);
		}

		return super.plus(other);
	}

	public times(other: SmoothFunction): SmoothFunction {
		if (!(other instanceof Polynomial)) {
			return super.times(other);
		}

		const greatestPowerOfT = this.coefficients.length - 1 + other.coefficients.length - 1;
		// An array of all zeros.
		const newCoefficients = new Array<number>(greatestPowerOfT + 1);

		// Fill the array
		for (let i = 0; i < this.coefficients.length; i++) {
			// Each term pairs with each other term.
			for (let j = 0; j < other.coefficients.length; j++) {
				const leftPower = i;
				const rightPower = j;
				newCoefficients[leftPower + rightPower] ??= 0;
				newCoefficients[leftPower + rightPower] += this.coefficients[i] * other.coefficients[j];
			}
		}

		return new Polynomial(newCoefficients);
	}

	public timesConstant(scalar: number): SmoothFunction {
		return new Polynomial(this.coefficients.map(coeff => scalar * coeff));
	}

	public toString(): string {
		const result = [];

		for (let i = 0; i < this.coefficients.length; i++) {
			let part = this.coefficients[i].toString();

			if (i > 0) {
				part += 't';
			}
			if (i > 1) {
				part += `^${i}`;
			}

			result.push(part);
		}

		return result.join(' + ');
	}
}

/**
 * Represents a piecewise smooth function that maps from ℝ → ℝ³
 *
 * Implementers should either override xComponent, yComponent, zComponent
 * or override at(t).
 */
export abstract class SmoothVectorFunction {
	public at(t: number): Vec3 {
		return Vec3.of(this.xComponent.at(t), this.yComponent.at(t), this.zComponent.at(t));
	}

	public derivativeAt(t: number): Vec3 {
		return Vec3.of(
			this.xComponent.derivativeAt(t),
			this.yComponent.derivativeAt(t),
			this.zComponent.derivativeAt(t)
		);
	}

	public normAt(t: number, vecCross: Vec3 = Vec3.unitZ): Vec3 {
		const derivative = this.derivativeAt(t);
		return derivative.cross(vecCross).normalized();
	}

	public readonly magnitude: SmoothFunction = SmoothFunction.ofFn(t => this.at(t).magnitude());
	public readonly magnitudeSquared: SmoothFunction = SmoothFunction.ofFn(t => {
		const val = this.at(t);
		return val.dot(val);
	});

	public abstract readonly xComponent: SmoothFunction;
	public abstract readonly yComponent: SmoothFunction;
	public abstract readonly zComponent: SmoothFunction;

	/** @return result(t) = this(t) + other(t) */
	public plus(other: SmoothVectorFunction): SmoothVectorFunction {
		const original = this;

		return new (class extends SmoothVectorFunction {
			public xComponent: SmoothFunction = original.xComponent.plus(other.xComponent);
			public yComponent: SmoothFunction = original.yComponent.plus(other.yComponent);
			public zComponent: SmoothFunction = original.zComponent.plus(other.zComponent);
		})();
	}

	/** @return result(t) = this(t) * [scalar] */
	public times(scalar: number): SmoothVectorFunction {
		const original = this;

		return new (class extends SmoothVectorFunction {
			public xComponent: SmoothFunction = original.xComponent.times(scalar);
			public yComponent: SmoothFunction = original.yComponent.times(scalar);
			public zComponent: SmoothFunction = original.zComponent.times(scalar);
		})();
	}

	/** @see plus */
	public minus(other: SmoothVectorFunction): SmoothVectorFunction {
		return this.plus(other.times(-1));
	}

	/** Gives the distance to the given point as a function of t */
	public distSquaredFn(toPoint: Point2): SmoothFunction {
		return this.minus(SmoothVectorFunction.ofConstant(toPoint)).magnitudeSquared;
	}

	/**
	 * Approximate the closest point on this to [input]
	 * @param pointToApprox The point (probably off the curve) to project onto this.
	 * @param minT Minimum bound on the input to this
	 * @param maxT Maximum bound on the input to this
	 * @param numCandidates Number of starting points for the algorithm
	 */
	public inputForClosestPoint(
		pointToApprox: Point2, minT: number, maxT: number, numCandidates: number = 5
	): number {
		return this.distSquaredFn(pointToApprox).minimize(minT, maxT, numCandidates);
	}

	/**
	 * Approximate the mean square error of the given set of points
	 */
	public meanSquareError(
		points: Point2[], minT: number, maxT: number, candidatesPerPoint: number = 5
	): number {
		let mse = 0;

		for (const point of points) {
			const input = this.inputForClosestPoint(point, minT, maxT, candidatesPerPoint);
			const displacement = this.at(input).minus(point);
			mse += displacement.dot(displacement);
		}

		return mse;
	}

	/**
	 * x-component calculated using this.at.
	 *
	 * Computations using derivedXComponent will be slower than computations using
	 * this.at. As such, use derivedXComponent, derivedYComponent, and derivedZComponent
	 * to initialize xComponent, yComponent, and zComponent when performance is not
	 * critical and it is more readable to compute the components of this with vectors.
	 *
	 * If `derivedXComponent` is used, `at` **must** be overridden!
	 */
	protected readonly derivedXComponent: SmoothFunction = SmoothFunction.ofFn(t => this.at(t).x);

	/**
	 * y-component calculated using this.at
	 * @see derivedXComponent
	 */
	protected readonly derivedYComponent: SmoothFunction = SmoothFunction.ofFn(t => this.at(t).y);

	/**
	 * z-component calculated using this.at
	 * @see derivedXComponent
	 */
	protected readonly derivedZComponent: SmoothFunction = SmoothFunction.ofFn(t => this.at(t).z);

	public static ofConstant(v: Vec3): SmoothVectorFunction {
		return new (class extends SmoothVectorFunction {
			public xComponent: SmoothFunction = SmoothFunction.ofConstant(v.x);
			public yComponent: SmoothFunction = SmoothFunction.ofConstant(v.y);
			public zComponent: SmoothFunction = SmoothFunction.ofConstant(v.z);
		})();
	}
}

/**
 * Represents a cubic Bézier curve
 * (B_{P_0P_1P_2P_3}(t)) = \sum_{k=0}^n {n \choose k} t^k (1 - t)^{n - k} P_k
 *
 * See https://en.wikipedia.org/wiki/Bézier_curve
 */
export class CubicBezierCurve extends SmoothVectorFunction {
	public readonly xComponent: SmoothFunction;
	public readonly yComponent: SmoothFunction;
	public readonly zComponent: SmoothFunction;

	public constructor(
		public readonly p0: Point2, public readonly p1: Point2,
		public readonly p2: Point2, public readonly p3: Point2
	) {
		super();

		// B(t) = P₀(1 - t)³ + 3 P₁ (1 - t) t² + 3 P₂ (1 - t)² t + P₃t³
		//      = P₀(1 - 3t + 3t² - t³) + 3P₂(1 - 2t + t²)t + 3 P₁(t² - t³) + P₃t³
		//      = P₀(1 - 3t + 3t² - t³) + 3P₂(t - 2t² + t³) + 3 P₁(t² - t³) + P₃t³
		//      = P₀ - 3P₀t + 3P₀t² - P₀t³ + 3P₂t - 3P₂2t² + 3P₂t³ + 3 P₁ t² - 3 P₁ t³ + P₃t³
		//      = P₀ - 3P₀t + 3P₂t - 3P₂2t² + 3P₀t² + 3 P₁ t² + 3P₂t³ - 3 P₁ t³ + P₃t³ - P₀t³
		//      = P₀ + (-3P₀ + 3P₂)t + (-3P₂2 + 3P₀ + 3 P₁)t² + (3P₂ - 3 P₁ + P₃ - P₀)t³
		//      = P₀ + (-3P₀ + 3P₂)t + (-6P₂ + 3P₀ + 3 P₁)t² + (3P₂ - 3 P₁ + P₃ - P₀)t³
		//      = P₀ + 3(-P₀ + P₂)t + 3(-2P₂ + P₀ + P₁)t² + (3P₂ - 3 P₁ + P₃ - P₀)t³
		const components = [
			p0,
			p2.minus(p0).times(3), // t
			p0.minus(p2.times(2)).plus(p1).times(3), // t²
			p2.times(3).minus(p1.times(3)).plus(p3).minus(p0), // t³
		];
		this.xComponent = new Polynomial(components.map(part => part.x));
		this.yComponent = new Polynomial(components.map(part => part.y));
		this.zComponent = new Polynomial(components.map(part => part.z));
	}

	/**
	 * Returns a cubic bezier curve (and MSE) that reasonably approximates
	 * the given points.
	 */
	public static approximationOf(
		points: Point2[], incomingGradient?: Point2
	): { curve: CubicBezierCurve; error: number} {
		const mseWithPoints = (p1: Point2, p2: Point2, p3: Point2, p4: Point2) => {
			const curve = new CubicBezierCurve(p1, p2, p3, p4);
			return curve.meanSquareError(points, 0, 1);
		};

		if (points.length < 2) {
			const point = 0 < points.length ? points[0] : Vec3.zero;
			const curve = new CubicBezierCurve(point, point, point, point);

			return {
				curve,
				error: curve.meanSquareError(points, 0, 1),
			};
		}

		if (incomingGradient == null) {
			incomingGradient = points[1].minus(points[0]);
		}

		incomingGradient = incomingGradient.normalized();

		let outgoingGradient = points[points.length - 1].minus(points[points.length - 2]);
		outgoingGradient = outgoingGradient.normalized();

		// Constraints:
		//  •  B'(0) = α incomingGradient/|incomingGradient|

		// Base p1 and p2 on hueristics (a reasonable range for variation)
		const p0 = points[0];
		const p1 = (t: number) => incomingGradient.times(4 * t);
		const p2 = (t: number) => outgoingGradient.times(4 * t);
		const p3 = points[points.length - 1];

		// We don't need true MSE, just an approximation
		let mseFunction = SmoothFunction.ofFn(
			t => (
				mseWithPoints(p0, p1(t), p2(t), p3)
			)
		).taylorApproximated(5, 0.5);

		const minimizingT1 = mseFunction.minimize(0, 1);
		mseFunction = SmoothFunction.ofFn(
			t => (
				mseWithPoints(p0, p1(minimizingT1), p2(t), p3)
			),
		).taylorApproximated(5, 0.5);

		const minimizingT2 = mseFunction.minimize(0, 1);
		const curve = new CubicBezierCurve(p0, p1(minimizingT1), p2(minimizingT2), p3);
		const error = mseFunction.at(minimizingT2);
		return {
			curve,
			error,
		};
	}
}

