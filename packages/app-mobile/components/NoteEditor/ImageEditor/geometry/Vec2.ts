import Vec3 from "./Vec3";

export namespace Vec2 {
	export const of = (x: number, y: number): Vec2 => {
		return Vec3.of(x, y, 0);
	};

	export const ofXY = ({x, y}: { x: number, y: number }): Vec2 => {
		return Vec3.of(x, y, 0);
	};

	export const unitX = Vec2.of(1, 0);
	export const unitY = Vec2.of(0, 1);
	export const zero = Vec2.of(0, 0);
}

export type Point2 = Vec3;
export type Vec2 = Vec3; // eslint-disable-line