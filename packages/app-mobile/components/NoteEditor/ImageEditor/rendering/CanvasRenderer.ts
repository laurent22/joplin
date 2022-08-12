import Color4 from '../Color4';
import { Point2, Vec2 } from '../geometry/Vec2';
import Vec3 from '../geometry/Vec3';
import Viewport from '../Viewport';
import AbstractRenderer, { RenderingStyle } from './AbstractRenderer';

const minSquareCurveApproxDist = 25;
export default class CanvasRenderer extends AbstractRenderer {
	public constructor(private ctx: CanvasRenderingContext2D, viewport: Viewport) {
		super(viewport);
	}

	public displaySize(): Vec2 {
		return Vec2.of(
			this.ctx.canvas.clientWidth,
			this.ctx.canvas.clientHeight
		);
	}

	public clear() {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	}

	protected beginPath(startPoint: Point2) {
		startPoint = this.viewport.canvasToScreen(startPoint);

		this.ctx.beginPath();
		this.ctx.moveTo(startPoint.x, startPoint.y);
	}

	protected endPath(style: RenderingStyle) {
		this.ctx.fillStyle = style.fill.toHexString();
		this.ctx.fill();

		if (style.stroke) {
			this.ctx.strokeStyle = style.stroke.color.toHexString();
			this.ctx.lineWidth = this.viewport.getScaleFactor() * style.stroke.width;
			this.ctx.stroke();
		}

		this.ctx.closePath();
	}

	protected lineTo(point: Point2) {
		point = this.viewport.canvasToScreen(point);
		this.ctx.lineTo(point.x, point.y);
	}

	protected moveTo(point: Point2) {
		point = this.viewport.canvasToScreen(point);
		this.ctx.moveTo(point.x, point.y);
	}

	protected traceCubicBezierCurve(p1: Point2, p2: Point2, p3: Point2) {
		p1 = this.viewport.canvasToScreen(p1);
		p2 = this.viewport.canvasToScreen(p2);
		p3 = this.viewport.canvasToScreen(p3);

		// Approximate the curve if small enough.
		const delta1 = p2.minus(p1);
		const delta2 = p3.minus(p2);
		if (delta1.magnitudeSquared() < minSquareCurveApproxDist
			&& delta2.magnitudeSquared() < minSquareCurveApproxDist) {
			this.ctx.lineTo(p3.x, p3.y);
		} else {
			this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
		}
	}

	protected traceQuadraticBezierCurve(controlPoint: Vec3, endPoint: Vec3) {
		controlPoint = this.viewport.canvasToScreen(controlPoint);
		endPoint = this.viewport.canvasToScreen(endPoint);

		// Approximate the curve with a line if small enough
		const delta = controlPoint.minus(endPoint);
		if (delta.magnitudeSquared() < minSquareCurveApproxDist) {
			this.ctx.lineTo(endPoint.x, endPoint.y);
		} else {
			this.ctx.quadraticCurveTo(
				controlPoint.x, controlPoint.y, endPoint.x, endPoint.y
			);
		}
	}

	public drawPoints(...points: Point2[]) {
		const pointRadius = 10;

		for (let i = 0; i < points.length; i++) {
			const point = this.viewport.canvasToScreen(points[i]);

			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
			this.ctx.fillStyle = Color4.ofRGBA(
				0.5 + Math.sin(i) / 2,
				1.0,
				0.5 + Math.cos(i * 0.2) / 4, 0.5
			).toHexString();
			this.ctx.fill();
			this.ctx.stroke();
			this.ctx.closePath();

			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillStyle = 'black';
			this.ctx.fillText(`${i}`, point.x, point.y, pointRadius * 2);
		}
	}
}
