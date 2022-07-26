/**
 * Represents an ImageEditor's viewable region.
 */

import Command from './commands/Command';
import ImageEditor from './editor';
import Mat33 from './geometry/Mat33';
import Rect2 from './geometry/Rect2';
import { Point2, Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import { EditorEventType, EditorNotifier } from './types';

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
			editor.queueRerender();
		}

		public unapply(editor: ImageEditor) {
			const viewport = editor.viewport;
			viewport.updateTransform(viewport.transform.rightMul(this.inverseTransform));
			editor.queueRerender();
		}
	};

	private transform: Mat33;
	private inverseTransform: Mat33;
	private screenRect: Rect2;

	public constructor(private notifier: EditorNotifier) {
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
		this.notifier.dispatch(EditorEventType.ViewportChanged, {
			kind: EditorEventType.ViewportChanged,
			newTransform,
		});
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
