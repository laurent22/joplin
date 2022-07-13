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

	public drawStyledCubicBezierCurve(
		p0: StrokeDataPoint, p1: Point2, p2: Point2, p3: StrokeDataPoint
	): void {
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


		this.beginPath();
		this.traceCubicBezierCurve(upperP0, upperP1, upperP2, upperP3);
		this.traceCubicBezierCurve(lowerP3, lowerP2, lowerP1, lowerP0);
		this.fill({
			color: p3.color,
		});
		this.endPath();
	}
}
