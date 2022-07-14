
import { ImageEditor } from '../editor';
import { Mat33, Point2, Vec3 } from '../math';
import { Pointer } from '../types';
import { Viewport } from '../Viewport';
import BaseTool from './BaseTool';
import { ToolType } from './BaseTool';

interface PinchData {
	canvasCenter: Point2;
	screenCenter: Point2;
	angle: number;
	dist: number;
}

export default class PanZoom extends BaseTool {
	public readonly type = ToolType.PanZoom;
	private transform: Viewport.ViewportTransform;

	private lastAngle: number;
	private lastDist: number;
	private lastScreenCenter: Point2;

	public constructor(private editor: ImageEditor) {
		super();
	}

	/** @return information about the pointers in a gesture */
	public computePinchData(p1: Pointer, p2: Pointer): PinchData {
		const screenBetween = p2.screenPos.minus(p1.screenPos);
		const angle = screenBetween.angle();
		const dist = screenBetween.magnitude();
		const canvasCenter = p2.canvasPos.plus(p1.canvasPos).times(0.5);
		const screenCenter = p2.screenPos.plus(p1.screenPos).times(0.5);

		return { canvasCenter, screenCenter, angle, dist };
	}

	public onPointerDown(_current: Pointer, allPointers: Pointer[]): boolean {
		if (allPointers.length == 2) {
			this.transform = new Viewport.ViewportTransform(Mat33.identity);

			const { screenCenter, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);
			this.lastAngle = angle;
			this.lastDist = dist;
			this.lastScreenCenter = screenCenter;
			return true;
		}

		return false;
	}

	public onPointerMove(_current: Pointer, allPointers: Pointer[]): void {
		if (allPointers.length != 2) {
			return;
		}

		this.transform ??= new Viewport.ViewportTransform(Mat33.identity);

		const { screenCenter, canvasCenter, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);

		// Use transformVec3 to avoid translating the delta
		const delta = this.editor.viewport.screenToCanvasTransform.transformVec3(screenCenter.minus(this.lastScreenCenter));

		const transformUpdate = Mat33.translation(delta)
			.rightMul(Mat33.scaling2D(dist / this.lastDist, canvasCenter))
			.rightMul(Mat33.zRotation(angle - this.lastAngle, canvasCenter));
		this.lastScreenCenter = screenCenter;
		this.lastDist = dist;
		this.lastAngle = angle;

		this.transform.unapply(this.editor);
		this.transform = new Viewport.ViewportTransform(
			this.transform.transform.rightMul(transformUpdate)
		);
		this.transform.apply(this.editor);
	}

	public onPointerUp(_pointer: Pointer, _allPointers: Pointer[]): void {
		if (this.transform) {
			this.transform.unapply(this.editor);
			this.editor.dispatch(this.transform);
			this.transform = null;
		}
	}

	public onGestureCancel(): void {
		this.transform?.unapply(this.editor);
		this.transform = null;
	}

	public onWheel(delta: Vec3, screenPos: Point2): boolean {
		if (this.transform == null) {
			this.transform = new Viewport.ViewportTransform(Mat33.identity);
		}

		const canvasPos = this.editor.viewport.screenToCanvas(screenPos);
		// Transform without including translation
		const translation =
			this.editor.viewport.screenToCanvasTransform.transformVec3(
				Vec3.of(-delta.x, -delta.y, 0)
			);
		const pinchZoomScaleFactor = 1.04;
		const transformUpdate = Mat33.scaling2D(Math.pow(pinchZoomScaleFactor, -delta.z), canvasPos).rightMul(
			Mat33.translation(translation)
		);

		this.transform.unapply(this.editor);
		this.transform = new Viewport.ViewportTransform(
			this.transform.transform.rightMul(transformUpdate)
		);
		this.transform.apply(this.editor);

		return true;
	}
}
