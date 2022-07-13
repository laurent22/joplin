import Color4 from '../Color4';
import { Point2 } from '../math';
import Viewport from '../Viewport';
import AbstractRenderer, { FillStyle } from './AbstractRenderer';

export default class CanvasRenderer extends AbstractRenderer {
	public constructor(private ctx: CanvasRenderingContext2D, viewport: Viewport) {
		super(viewport);
	}

	public clear(): void {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

		const visibleRect = this.viewport.visibleRect;
		const renderable = visibleRect.transformedBoundingBox(this.viewport.canvasToScreenTransform);
		this.ctx.lineWidth = 12;
		this.ctx.strokeRect(renderable.x, renderable.y, renderable.w, renderable.h);
		this.ctx.font = '22pt serif';
		this.ctx.fillText(`☒ Factor: ${this.viewport.getScaleFactor()}`, 0, 33);
	}
	public beginPath(): void {
		this.ctx.beginPath();
	}
	public endPath(): void {
		this.ctx.closePath();
	}
	public fill(style: FillStyle): void {
		this.ctx.fillStyle = style.color.toHexString();
		this.ctx.strokeStyle = this.ctx.fillStyle;
		this.ctx.lineWidth = 1;
		this.ctx.fill();
		this.ctx.stroke();
	}
	public traceCubicBezierCurve(p0: Point2, p1: Point2, p2: Point2, p3: Point2): void {
		p0 = this.viewport.canvasToScreen(p0);
		p1 = this.viewport.canvasToScreen(p1);
		p2 = this.viewport.canvasToScreen(p2);
		p3 = this.viewport.canvasToScreen(p3);

		this.ctx.lineTo(p0.x, p0.y);
		this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
	}
	public drawPoints(...points: Point2[]): void {
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
