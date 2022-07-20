
import { ImageEditor } from '../editor';
import { Mat33, Point2, Vec3 } from '../math';
import { Pointer, PointerDevice, PointerEvt, WheelEvt } from '../types';
import { Viewport } from '../Viewport';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

interface PinchData {
	canvasCenter: Point2;
	screenCenter: Point2;
	angle: number;
	dist: number;
}

export enum PanZoomMode {
	/**
	 * Handle one-pointer gestures (touchscreen only unless AnyDevice is set)
	 * @see AnyDevice
	 */
	OneFingerGestures = 0x1,

	/**
	 * Handle two-pointer gestures (touchscreen only unless AnyDevice is set)
	 * @see AnyDevice
	 */
	TwoFingerGestures = 0x1 << 1,

	/** Handle gestures from any device, rather than just touch */
	AnyDevice = 0x1 << 2,
};

export default class PanZoom extends BaseTool {
	public readonly kind: ToolType.PanZoom = ToolType.PanZoom;
	private transform: Viewport.ViewportTransform;

	private lastAngle: number;
	private lastDist: number;
	private lastScreenCenter: Point2;

	public constructor(private editor: ImageEditor, private mode: PanZoomMode) {
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

	private pointersHaveCorrectDeviceType(pointers: Pointer[]) {
		return this.mode & PanZoomMode.AnyDevice || pointers.every(pointer => pointer.device === PointerDevice.Touch);
	}

	public onPointerDown({ allPointers }: PointerEvt): boolean {
		let handlingGesture;

		if (!this.pointersHaveCorrectDeviceType(allPointers)) {
			handlingGesture = false;
		} else if (allPointers.length === 2 && this.mode & PanZoomMode.TwoFingerGestures) {
			const { screenCenter, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);
			this.lastAngle = angle;
			this.lastDist = dist;
			this.lastScreenCenter = screenCenter;
			handlingGesture = true;
		} else if (allPointers.length === 1 && this.mode & PanZoomMode.OneFingerGestures) {
			this.lastScreenCenter = allPointers[0].screenPos;
			handlingGesture = true;
		}

		if (handlingGesture) {
			this.transform ??= new Viewport.ViewportTransform(Mat33.identity);
		}

		return handlingGesture;
	}

	private handleTwoFingerMove(allPointers: Pointer[]) {
		const { screenCenter, canvasCenter, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);

		// Use transformVec3 to avoid translating the delta
		const delta = this.editor.viewport.screenToCanvasTransform.transformVec3(screenCenter.minus(this.lastScreenCenter));

		const transformUpdate = Mat33.translation(delta)
			.rightMul(Mat33.scaling2D(dist / this.lastDist, canvasCenter))
			.rightMul(Mat33.zRotation(angle - this.lastAngle, canvasCenter));
		this.lastScreenCenter = screenCenter;
		this.lastDist = dist;
		this.lastAngle = angle;
		this.transform = new Viewport.ViewportTransform(
			this.transform.transform.rightMul(transformUpdate)
		);
	}

	private handleOneFingerMove(pointer: Pointer) {
		this.transform = new Viewport.ViewportTransform(
			this.transform.transform.rightMul(
				Mat33.translation(pointer.screenPos.minus(this.lastScreenCenter))
			)
		);
		this.lastScreenCenter = pointer.screenPos;
	}

	public onPointerMove({ allPointers }: PointerEvt): void {
		this.transform ??= new Viewport.ViewportTransform(Mat33.identity);

		this.transform.unapply(this.editor);
		if (allPointers.length === 2 && this.mode & PanZoomMode.TwoFingerGestures) {
			this.handleTwoFingerMove(allPointers);
		} else if (allPointers.length === 1 && this.mode & PanZoomMode.OneFingerGestures) {
			this.handleOneFingerMove(allPointers[0]);
		}
		this.transform.apply(this.editor);
	}

	public onPointerUp(_event: PointerEvt): void {
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

	public onWheel({ delta, screenPos }: WheelEvt): boolean {
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
