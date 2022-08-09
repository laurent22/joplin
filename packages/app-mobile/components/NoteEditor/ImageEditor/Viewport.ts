/**
 * Represents an ImageEditor's viewable region.
 */

import Command from './commands/Command';
import ImageEditor from './editor';
import Mat33 from './geometry/Mat33';
import Rect2 from './geometry/Rect2';
import { Point2, Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import { StrokeDataPoint } from './StrokeBuilder';
import { EditorEventType, EditorNotifier } from './types';

// Returns the base type of some type of point/number
type PointDataType<T extends Point2|StrokeDataPoint|number> = T extends Point2 ? Point2 : number;

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
			viewport.resetTransform(viewport.transform.rightMul(this.transform));
			editor.queueRerender();
		}

		public unapply(editor: ImageEditor) {
			const viewport = editor.viewport;
			viewport.resetTransform(viewport.transform.rightMul(this.inverseTransform));
			editor.queueRerender();
		}
	};

	private transform: Mat33;
	private inverseTransform: Mat33;
	private screenRect: Rect2;

	public constructor(private notifier: EditorNotifier) {
		this.resetTransform(Mat33.identity);
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

	// Updates the transformation directly. Using ViewportTransform is preferred.
	public resetTransform(newTransform: Mat33) {
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

	// Returns the amount a vector on the canvas is scaled to become a vector on the screen.
	public getScaleFactor(): number {
		// Use transformVec3 to avoid translating the vector
		return this.transform.transformVec3(Vec3.unitX).magnitude();
	}

	// Returns the angle of the canvas in radians
	public getRotationAngle(): number {
		return this.transform.transformVec3(Vec3.unitX).angle();
	}

	// Rounds the given [point] to a multiple of 10 such that it is within [tolerance] of
	// its original location. This is useful for preparing data for base-10 conversion.
	public static roundPoint<T extends Point2|number>(
		point: T, tolerance: number,
	): PointDataType<T>;

	// The separate function type definition seems necessary here.
	// See https://stackoverflow.com/a/58163623/17055750.
	// eslint-disable-next-line no-dupe-class-members
	public static roundPoint(
		point: Point2|number, tolerance: number
	): Point2|number {
		const scaleFactor = 10 ** Math.floor(Math.log10(tolerance));
		const roundComponent = (component: number): number => {
			return Math.round(component / scaleFactor) * scaleFactor;
		};

		if (typeof point === 'number') {
			return roundComponent(point);
		}

		return point.map(roundComponent);
	}


	// Round a point with a tolerance of ±1 screen unit.
	public roundPoint(point: Point2): Point2 {
		return Viewport.roundPoint(point, 1 / this.getScaleFactor());
	}
}

export namespace Viewport { // eslint-disable-line
	// Needed to allow accessing as a type. See https://stackoverflow.com/a/68201883
	export type ViewportTransform = typeof Viewport.ViewportTransform.prototype;
}

export default Viewport;
