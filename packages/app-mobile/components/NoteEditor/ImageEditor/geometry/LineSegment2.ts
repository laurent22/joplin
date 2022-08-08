import Rect2 from './Rect2';
import { Vec2, Point2 } from './Vec2';

interface IntersectionResult {
	point: Point2;
	t: number;
}

export default class LineSegment2 {
	public readonly direction: Vec2;
	public readonly length: number;
	public readonly bbox;

	public constructor(
		private readonly point1: Point2,
		private readonly point2: Point2
	) {
		this.bbox = Rect2.bboxOf([point1, point2]);

		this.direction = point2.minus(point1);
		this.length = this.direction.magnitude();

		// Normalize
		if (this.length > 0) {
			this.direction = this.direction.times(1 / this.length);
		}
	}

	// Accessors to make LineSegment2 compatible with bezier-js's
	// interface
	public get p1(): Point2 {
		return this.point1;
	}

	public get p2(): Point2 {
		return this.point2;
	}

	public get(t: number): Point2 {
		return this.point1.plus(this.direction.times(t));
	}

	public intersection(other: LineSegment2): IntersectionResult|null {
		// We want x₁(t) = x₂(t) and y₁(t) = y₂(t)
		// Observe that
		// x = this.point1.x + this.direction.x · t₁
		//   = other.point1.x + other.direction.x · t₂
		// Thus,
		//  t₁ = (x - this.point1.x) / this.direction.x
		//     = (y - this.point1.y) / this.direction.y
		// and
		//  t₂ = (x - other.point1.x) / other.direction.x
		// (and similarly for y)
		//
		// Letting o₁ₓ = this.point1.x, o₂ₓ = other.point1.x,
		//         d₁ᵧ = this.direction.y, ...
		//
		// We can substitute these into the equations for y:
		// y = o₁ᵧ + d₁ᵧ · (x - o₁ₓ) / d₁ₓ
		//   = o₂ᵧ + d₂ᵧ · (x - o₂ₓ) / d₂ₓ
		// ⇒ o₁ᵧ - o₂ᵧ = d₂ᵧ · (x - o₂ₓ) / d₂ₓ - d₁ᵧ · (x - o₁ₓ) / d₁ₓ
		//            = (d₂ᵧ/d₂ₓ)(x) - (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(x) + (d₁ᵧ/d₁ₓ)(o₁ₓ)
		//            = (x)(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ) - (d₂ᵧ/d₂ₓ)(o₂ₓ) + (d₁ᵧ/d₁ₓ)(o₁ₓ)
		// ⇒ (x)(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ) = o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ)
		// ⇒ x = (o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ))/(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ)
		//     = (d₁ₓd₂ₓ)(o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
		//     = ((o₁ᵧ - o₂ᵧ)((d₁ₓd₂ₓ)) + (d₂ᵧd₁ₓ)(o₂ₓ) - (d₁ᵧd₂ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
		// ⇒ y = o₁ᵧ + d₁ᵧ · (x - o₁ₓ) / d₁ₓ = ...
		let resultPoint, resultT;
		if (this.direction.x === 0) {
			// Vertical line: Where does the other have x = this.point1.x?
			// x = o₁ₓ = o₂ₓ + d₂ₓ · (y - o₂ᵧ) / d₂ᵧ
			// ⇒ (o₁ₓ - o₂ₓ)(d₂ᵧ/d₂ₓ) + o₂ᵧ = y

			// Avoid division by zero
			if (other.direction.x === 0 || this.direction.y === 0) {
				return null;
			}

			const xIntersect = this.point1.x;
			const yIntersect =
				(this.point1.x - other.point1.x) * other.direction.y / other.direction.x + other.point1.y;
			resultPoint = Vec2.of(xIntersect, yIntersect);
			resultT = (yIntersect - this.point1.y) / this.direction.y;
		} else {
			// From above,
			// x = ((o₁ᵧ - o₂ᵧ)(d₁ₓd₂ₓ) + (d₂ᵧd₁ₓ)(o₂ₓ) - (d₁ᵧd₂ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
			const numerator = (
				(this.point1.y - other.point1.y) * this.direction.x * other.direction.x
				+ this.direction.x * other.direction.y * other.point1.x
				- this.direction.y * other.direction.x * this.point1.x
			);
			const denominator = (
				other.direction.y * this.direction.x
				- this.direction.y * other.direction.x
			);

			// Avoid dividing by zero. It means there is no intersection
			if (denominator === 0) {
				return null;
			}

			const xIntersect = numerator / denominator;
			const t1 = (xIntersect - this.point1.x) / this.direction.x;
			const yIntersect = this.point1.y + this.direction.y * t1;
			resultPoint = Vec2.of(xIntersect, yIntersect);
			resultT = (xIntersect - this.point1.x) / this.direction.x;
		}

		// Ensure the result is in this/the other segment.
		const resultToP1 = resultPoint.minus(this.point1).magnitude();
		const resultToP2 = resultPoint.minus(this.point2).magnitude();
		const resultToP3 = resultPoint.minus(other.point1).magnitude();
		const resultToP4 = resultPoint.minus(other.point2).magnitude();
		if (resultToP1 > this.length
			|| resultToP2 > this.length
			|| resultToP3 > other.length
			|| resultToP4 > other.length) {
			return null;
		}

		return {
			point: resultPoint,
			t: resultT,
		};
	}
}
