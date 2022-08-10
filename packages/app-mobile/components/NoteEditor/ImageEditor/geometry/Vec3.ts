

// A vector with three components. Can also be used to represent a two-component vector
export default class Vec3 {
	private constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number
	) {
	}

	// Returns the x, y components of this
	public get xy(): { x: number; y: number } {
		// Useful for APIs that behave differently if .z is present.
		return {
			x: this.x,
			y: this.y,
		};
	}

	public static of(x: number, y: number, z: number): Vec3 {
		return new Vec3(x, y, z);
	}

	// Returns this' [idx]th component
	public at(idx: number): number {
		if (idx === 0) return this.x;
		if (idx === 1) return this.y;
		if (idx === 2) return this.z;

		throw new Error(`${idx} out of bounds!`);
	}

	public magnitude(): number {
		return Math.sqrt(this.dot(this));
	}

	public magnitudeSquared(): number {
		return this.dot(this);
	}

	// Return this' angle in the XY plane (treats this as a Vec2)
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

	// Returns this plus a vector of length [distance] in [direction]
	public extend(distance: number, direction: Vec3): Vec3 {
		return this.plus(direction.normalized().times(distance));
	}

	// Returns a vector [fractionTo] of the way to target from this.
	public lerp(target: Vec3, fractionTo: number): Vec3 {
		return this.times(1 - fractionTo).plus(target.times(fractionTo));
	}

	// [zip] Maps a component of this and a corresponding component of
	// [other] to a component of the output vector.
	public zip(
		other: Vec3, zip: (componentInThis: number, componentInOther: number)=> number
	): Vec3 {
		return Vec3.of(
			zip(other.x, this.x),
			zip(other.y, this.y),
			zip(other.z, this.z)
		);
	}

	// Returns a vector with each component acted on by [fn]
	public map(fn: (component: number)=> number): Vec3 {
		return Vec3.of(
			fn(this.x), fn(this.y), fn(this.z)
		);
	}

	public asArray(): number[] {
		return [this.x, this.y, this.z];
	}

	// [fuzz] The maximum difference between two components for this and [other]
	// to be considered equal.
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
