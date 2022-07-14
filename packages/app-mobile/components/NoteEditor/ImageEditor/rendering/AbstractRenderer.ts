import Color4 from '../Color4';
import { CubicBezierCurve, Point2 } from '../math';
import { StrokeDataPoint } from '../Stroke';
import Viewport from '../Viewport';

export interface FillStyle {
	color: Color4;
}

export default abstract class AbstractRenderer {
	protected constructor(protected viewport: Viewport) { }
	public abstract clear(): void;
	public abstract beginPath(): void;
	public abstract endPath(): void;
	public abstract fill(style: FillStyle): void;
	public abstract traceCubicBezierCurve(p0: Point2, p1: Point2, p2: Point2, p3: Point2): void;
	public abstract drawPoints(...points: Point2[]): void;

	/**
	 * @returns a function that can be called to re-render the curve (less expensive than calling
	 * this function again.)
	 */
	public drawStyledCubicBezierCurve(
		p0: StrokeDataPoint, p1: Point2, p2: Point2, p3: StrokeDataPoint
	): ((renderer: AbstractRenderer)=> void) {
		if (p0.pos.minus(p1).magnitude() > p0.pos.minus(p2).magnitude()) {
			const tmp = p1;
			p1 = p2;
			p2 = tmp;
		}

		if (p0.pos.minus(p1).magnitude() < 1e-6) {
			p1 = p0.pos.lerp(p3.pos, 0.25);
		}
		if (p3.pos.minus(p2).magnitude() < 1e-6) {
			p2 = p3.pos.lerp(p0.pos, 0.25);
		}

		const curve = new CubicBezierCurve(p0.pos, p1, p2, p3.pos);
		const startingNorm = curve.normAt(0);
		const endingNorm = curve.normAt(1);
		const halfwayNorm = startingNorm.lerp(endingNorm, 0.5);

		const upperP0 = p0.pos.extend(p0.width / 2, startingNorm);
		const upperP3 = p3.pos.extend(p3.width / 2, endingNorm);
		const upperP1 = p1.extend(p0.width / 2, halfwayNorm);
		const upperP2 = p2.extend(p3.width / 2, halfwayNorm);

		const lowerP0 = p0.pos.extend(-p0.width / 2, startingNorm);
		const lowerP3 = p3.pos.extend(-p3.width / 2, endingNorm);
		const lowerP1 = p1.extend(-p0.width / 2, halfwayNorm);
		const lowerP2 = p2.extend(-p3.width / 2, halfwayNorm);

		const color = p3.color;

		const render = (ctx: AbstractRenderer) => {
			ctx.beginPath();
			ctx.traceCubicBezierCurve(upperP0, upperP1, upperP2, upperP3);
			ctx.traceCubicBezierCurve(lowerP3, lowerP2, lowerP1, lowerP0);
			ctx.fill({
				color: color,
			});
			ctx.endPath();

			// const points = [];
			// for (let t = 0; t < 1.0; t += 0.1) {
			//	points.push(curve.at(t), curve.at(t).plus(curve.normAt(t).times(22)));
			// }
			// ctx.drawPoints(...points);
		};
		render(this);
		return render;
	}
}
