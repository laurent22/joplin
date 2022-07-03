/**
 * Represents an ImageEditor's viewable region.
 */

import ImageEditor from './editor';
import { Command } from './types';
import { Mat33, Point2 } from './math';

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
			//editor.rerender();
		}

		public unapply(editor: ImageEditor) {
			const viewport = editor.viewport;
			viewport.updateTransform(viewport.transform.rightMul(this.inverseTransform));
			//editor.rerender();
		}
	};

	private transform: Mat33;
	private inverseTransform: Mat33;

	public constructor() {
		this.updateTransform(Mat33.identity);
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
}

export namespace Viewport {
	// Needed to allow accessing as a type. See https://stackoverflow.com/a/68201883
	export type ViewportTransform = typeof Viewport.ViewportTransform.prototype;
}

export default Viewport;
