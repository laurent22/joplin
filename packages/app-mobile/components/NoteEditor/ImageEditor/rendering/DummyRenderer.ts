// Renderer that outputs nothing. Useful for automated tests.

import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import Vec3 from '../geometry/Vec3';
import Viewport from '../Viewport';
import AbstractRenderer, { RenderingStyle } from './AbstractRenderer';

export default class DummyRenderer extends AbstractRenderer {
	// Variables that track the state of what's been rendered
	public clearedCount: number = 0;
	public renderedPathCount: number = 0;
	public lastFillStyle: RenderingStyle|null = null;
	public lastPoint: Point2|null = null;
	public objectNestingLevel: number = 0;

	// List of points drawn since the last clear.
	public pointBuffer: Point2[] = [];

	public constructor(viewport: Viewport) {
		super(viewport);
	}

	public displaySize(): Vec2 {
		// Return a dummy
		return Vec2.of(640, 480);
	}

	public clear() {
		this.clearedCount ++;
		this.renderedPathCount = 0;
		this.pointBuffer = [];

		// Ensure all objects finished rendering
		if (this.objectNestingLevel > 0) {
			throw new Error(
				`Within an object while clearing! Nesting level: ${this.objectNestingLevel}`
			);
		}
	}
	protected beginPath(startPoint: Vec3) {
		this.lastPoint = startPoint;
		this.pointBuffer.push(startPoint);
	}
	protected endPath(style: RenderingStyle) {
		this.renderedPathCount++;
		this.lastFillStyle = style;
	}
	protected lineTo(point: Vec3) {
		this.lastPoint = point;
		this.pointBuffer.push(point);
	}
	protected moveTo(point: Point2) {
		this.lastPoint = point;
		this.pointBuffer.push(point);
	}
	protected traceCubicBezierCurve(p1: Vec3, p2: Vec3, p3: Vec3) {
		this.lastPoint = p3;
		this.pointBuffer.push(p1, p2, p3);
	}
	protected traceQuadraticBezierCurve(controlPoint: Vec3, endPoint: Vec3) {
		this.lastPoint = endPoint;
		this.pointBuffer.push(controlPoint, endPoint);
	}
	public drawPoints(..._points: Vec3[]) {
		// drawPoints is intended for debugging.
		// As such, it is unlikely to be the target of automated tests.
	}

	public startObject(boundingBox: Rect2) {
		super.startObject(boundingBox);

		this.objectNestingLevel += 1;
	}
	public endObject() {
		super.endObject();

		this.objectNestingLevel -= 1;
	}
}
