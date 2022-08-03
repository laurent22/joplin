
import Path, { PathCommand, PathCommandType } from '../geometry/Path';
import { Point2, Vec2 } from '../geometry/Vec2';
import Viewport from '../Viewport';
import AbstractRenderer, { FillStyle } from './AbstractRenderer';

export default class SVGRenderer extends AbstractRenderer {
	private currentPath: PathCommand[]|null = null;
	private pathStart: Point2|null;

	public constructor(private elem: SVGSVGElement, viewport: Viewport) {
		super(viewport);
	}
	public displaySize(): Vec2 {
		return Vec2.of(this.elem.clientWidth, this.elem.clientHeight);
	}
	public clear(): void {
		// Remove all children
		this.elem.replaceChildren();
	}
	protected beginPath(startPoint: Point2): void {
		this.currentPath = [];
		this.pathStart = this.viewport.canvasToScreen(startPoint);
	}
	protected endPath(style: FillStyle): void {
		const pathElem = document.createElement('path');
		pathElem.setAttribute('d', new Path(this.pathStart, this.currentPath).toString());
		pathElem.setAttribute('fill', style.color.toHexString());
		this.elem.appendChild(pathElem);

		this.currentPath = null;
	}
	protected lineTo(point: Point2): void {
		point = this.viewport.canvasToScreen(point);

		this.currentPath.push({
			kind: PathCommandType.LineTo,
			point,
		});
	}
	protected traceCubicBezierCurve(
		controlPoint1: Point2, controlPoint2: Point2, endPoint: Point2
	): void {
		controlPoint1 = this.viewport.canvasToScreen(controlPoint1);
		controlPoint2 = this.viewport.canvasToScreen(controlPoint2);
		endPoint = this.viewport.canvasToScreen(endPoint);

		this.currentPath.push({
			kind: PathCommandType.CubicBezierTo,
			controlPoint1,
			controlPoint2,
			endPoint,
		});
	}
	protected traceQuadraticBezierCurve(controlPoint: Point2, endPoint: Point2): void {
		controlPoint = this.viewport.canvasToScreen(controlPoint);
		endPoint = this.viewport.canvasToScreen(endPoint);

		this.currentPath.push({
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint,
			endPoint,
		});
	}
	public drawPoints(...points: Point2[]): void {
		points.map(point => {
			const elem = document.createElement('circle');
			elem.setAttribute('cx', `${point.x}`);
			elem.setAttribute('cy', `${point.y}`);
			elem.setAttribute('r', '15');
			this.elem.appendChild(elem);
		});
	}
}
