
import Path, { PathCommand, PathCommandType } from '../geometry/Path';
import { Point2, Vec2 } from '../geometry/Vec2';
import Viewport from '../Viewport';
import AbstractRenderer, { FillStyle } from './AbstractRenderer';

const svgNameSpace = 'http://www.w3.org/2000/svg';
export default class SVGRenderer extends AbstractRenderer {
	private currentPath: PathCommand[]|null = null;
	private pathStart: Point2|null;
	private mainGroup: SVGGElement;

	public constructor(private elem: SVGSVGElement, viewport: Viewport) {
		super(viewport);
		this.clear();
	}
	public displaySize(): Vec2 {
		return Vec2.of(this.elem.clientWidth, this.elem.clientHeight);
	}
	public clear(): void {
		this.mainGroup = document.createElementNS(svgNameSpace, 'g');

		// Remove all children
		this.elem.replaceChildren(this.mainGroup);
	}
	protected beginPath(startPoint: Point2): void {
		this.currentPath = [];
		this.pathStart = this.viewport.canvasToScreen(startPoint);
	}
	protected endPath(style: FillStyle): void {
		const pathElem = document.createElementNS(svgNameSpace, 'path');
		pathElem.setAttribute('d', new Path(this.pathStart, this.currentPath).toString());
		pathElem.setAttribute('fill', style.color.toHexString());
		this.mainGroup.appendChild(pathElem);

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
			const elem = document.createElementNS(svgNameSpace, 'circle');
			elem.setAttribute('cx', `${point.x}`);
			elem.setAttribute('cy', `${point.y}`);
			elem.setAttribute('r', '15');
			this.mainGroup.appendChild(elem);
		});
	}
}
