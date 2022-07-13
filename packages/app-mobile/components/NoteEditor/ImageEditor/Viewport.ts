/**
 * Represents an ImageEditor's viewable region.
 */

import ImageEditor from './editor';
import { Command } from './types';
import { Mat33, Point2, Rect2, Vec2, Vec3 } from './math';

export class Viewport {
	/**
	 * Command that translates/scales the viewport.
	 */
	public static ViewportTransform = class implements Command {
		private readonly inverseTransform: Mat33;

		public constructor(public readonly transform: Mat33) {
			this.inverseTransform = transform.inverse();
		}

		public apply(editor: ImageEditor) {
			const viewport = editor.viewport;
			viewport.updateTransform(viewport.transform.rightMul(this.transform));
			editor.rerender();
		}

		public unapply(editor: ImageEditor) {
			const viewport = editor.viewport;
			viewport.updateTransform(viewport.transform.rightMul(this.inverseTransform));
			editor.rerender();
		}
	};

	private transform: Mat33;
	private inverseTransform: Mat33;
	private screenRect: Rect2;

	public constructor() {
		this.updateTransform(Mat33.identity);
		this.screenRect = Rect2.empty;
	}

	public updateScreenSize(screenSize: Vec2) {
		this.screenRect = this.screenRect.resizedTo(screenSize);
	}

	public get visibleRect(): Rect2 {
		return this.screenRect.transformedBoundingBox(this.inverseTransform);
	}

	/** @return the given point, but in canvas coordinates */
	public screenToCanvas(screenPoint: Point2): Point2 {
		return this.inverseTransform.transformVec2(screenPoint);
	}

	/** @return the given point, but in screen coordinates */
	public canvasToScreen(canvasPoint: Point2): Point2 {
		return this.transform.transformVec2(canvasPoint);
	}

	private updateTransform(newTransform: Mat33) {
		this.transform = newTransform;
		this.inverseTransform = newTransform.inverse();
	}

	public get screenToCanvasTransform(): Mat33 {
		return this.inverseTransform;
	}

	public get canvasToScreenTransform(): Mat33 {
		return this.transform;
	}

	public getScaleFactor(): number {
		return this.transform.transformVec3(Vec3.unitX).magnitude();
	}
}

export namespace Viewport { // eslint-disable-line
	// Needed to allow accessing as a type. See https://stackoverflow.com/a/68201883
	export type ViewportTransform = typeof Viewport.ViewportTransform.prototype;
}

export default Viewport;
