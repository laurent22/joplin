
import Path, { PathCommand, PathCommandType } from '../geometry/Path';
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import Viewport from '../Viewport';
import AbstractRenderer, { FillStyle } from './AbstractRenderer';

const svgNameSpace = 'http://www.w3.org/2000/svg';
export default class SVGRenderer extends AbstractRenderer {
	private currentPath: PathCommand[]|null;
	private pathStart: Point2|null;

	private lastPathStyle: FillStyle|null;
	private lastPath: PathCommand[]|null;
	private lastPathStart: Point2|null;

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
		this.lastPathStart ??= this.pathStart;
	}
	protected endPath(style: FillStyle): void {
		// Try to extend the previous path, if possible
		if (style.color.eq(this.lastPathStyle?.color)) {
			this.lastPath.push({
				kind: PathCommandType.MoveTo,
				point: this.pathStart,
			}, ...this.currentPath);
			this.pathStart = null;
			this.currentPath = null;
		} else {
			this.addPathToSVG();
			this.lastPathStart = this.pathStart;
			this.lastPathStyle = style;
			this.lastPath = this.currentPath;

			this.pathStart = null;
			this.currentPath = null;
		}
	}

	// Push [this.fullPath] to the SVG
	private addPathToSVG() {
		if (!this.lastPathStyle || !this.lastPath) {
			return;
		}

		const pathElem = document.createElementNS(svgNameSpace, 'path');
		pathElem.setAttribute('d', Path.toString(this.lastPathStart, this.lastPath));
		pathElem.setAttribute('fill', this.lastPathStyle.color.toHexString());
		this.mainGroup.appendChild(pathElem);
	}

	public startObject(_boundingBox: Rect2): void {
		// Only accumulate a path within an object
		this.lastPath = null;
		this.lastPathStart = null;
		this.lastPathStyle = null;
	}
	public endObject(): void {
		// Don't extend paths across objects
		this.addPathToSVG();
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
