import { Point2, Vec2 } from './Vec2';
import Vec3 from './Vec3';

/**
 * Represents a three dimensional linear transformation or
 * a two-dimensional affine transformation.
 */
export default class Mat33 {
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

	// Either returns the inverse of this, or, if this matrix is singular/uninvertable,
	// returns Mat33.identity.
	public inverse(): Mat33 {
		return this.computeInverse() ?? Mat33.identity;
	}

	public invertable(): boolean {
		return this.computeInverse() !== null;
	}

	private cachedInverse: Mat33|undefined = undefined;
	private computeInverse(): Mat33|null {
		if (this.cachedInverse !== undefined) {
			return this.cachedInverse;
		}

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
			// Select the [cursor]th diagonal entry
			let pivot = toIdentity[cursor].at(cursor);

			// Don't divide by zero (treat very small numbers as zero).
			const minDivideBy = 1e-10;
			if (Math.abs(pivot) < minDivideBy) {
				let swapIndex = -1;
				// For all other rows,
				for (let i = 1; i <= 2; i++) {
					const otherRowIdx = (cursor + i) % 3;

					if (Math.abs(toIdentity[otherRowIdx].at(cursor)) >= minDivideBy) {
						swapIndex = otherRowIdx;
						break;
					}
				}

				// Can't swap with another row?
				if (swapIndex === -1) {
					this.cachedInverse = null;
					return null;
				}

				const tmpIdentityRow = toIdentity[cursor];
				const tmpResultRow = toResult[cursor];

				// Swap!
				toIdentity[cursor] = toIdentity[swapIndex];
				toResult[cursor] = toResult[swapIndex];
				toIdentity[swapIndex] = tmpIdentityRow;
				toResult[swapIndex] = tmpResultRow;

				pivot = toIdentity[cursor].at(cursor);
			}

			// Make toIdentity[k = cursor] = 1
			let scale = 1.0 / pivot;
			toIdentity[cursor] = toIdentity[cursor].times(scale);
			toResult[cursor] = toResult[cursor].times(scale);

			const cursorToIdentityRow = toIdentity[cursor];
			const cursorToResultRow = toResult[cursor];

			// Make toIdentity[k ≠ cursor] = 0
			for (let i = 1; i <= 2; i++) {
				const otherRowIdx = (cursor + i) % 3;
				scale = -toIdentity[otherRowIdx].at(cursor);
				toIdentity[otherRowIdx] = toIdentity[otherRowIdx].plus(
					cursorToIdentityRow.times(scale)
				);
				toResult[otherRowIdx] = toResult[otherRowIdx].plus(
					cursorToResultRow.times(scale)
				);
			}
		}

		const inverse = Mat33.ofRows(
			toResult[0],
			toResult[1],
			toResult[2]
		);
		this.cachedInverse = inverse;
		return inverse;
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
	public static scaling2D(amount: number|Vec2, center: Point2 = Vec2.zero): Mat33 {
		let result = Mat33.translation(center);
		let xAmount, yAmount;

		if (typeof amount === 'number') {
			xAmount = amount;
			yAmount = amount;
		} else {
			xAmount = amount.x;
			yAmount = amount.y;
		}

		result = result.rightMul(new Mat33(
			xAmount, 0, 0,
			0, yAmount, 0,
			0, 0, 1
		));

		// Translate such that [center] goes to (0, 0)
		return result.rightMul(Mat33.translation(center.times(-1)));
	}
}
