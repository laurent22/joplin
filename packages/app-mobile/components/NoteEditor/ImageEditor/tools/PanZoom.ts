
import { Tool, ImageEditor, ToolType } from '../editor';
import { Mat33, Point2 } from '../math';
import { Pointer } from '../types';
import { Viewport } from '../Viewport';

export default class PanZoom implements Tool {
	public readonly type = ToolType.PanZoom;
	private transform: Viewport.ViewportTransform;

	private lastAngle: number;
	private lastDist: number;
	private lastCenter: Point2;

	constructor(private editor: ImageEditor) {
	}

	/** @return information about the pointers in a gesture */
	computePinchData(p1: Pointer, p2: Pointer): { center: Point2, angle: number, dist: number } {
		const vecBetween = p2.screenPos.minus(p1.screenPos);
		const angle = vecBetween.angle();
		const dist = vecBetween.magnitude();
		const center = p2.screenPos.plus(p1.screenPos).times(0.5);

		return { center, angle, dist };
	}

	onPointerDown(_current: Pointer, allPointers: Pointer[]): boolean {
		if (allPointers.length == 2) {
			this.transform = new Viewport.ViewportTransform(Mat33.identity);

			const { center, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);
			this.lastAngle = angle;
			this.lastDist = dist;
			this.lastCenter = center;
			return true;
		}

		return false;
	}

	onPointerMove(_current: Pointer, allPointers: Pointer[]): void {
		if (allPointers.length != 2) {
			return;
		}

		const { center, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);

		const transformUpdate = Mat33.zRotation(angle - this.lastAngle, center).rightMul(
			Mat33.scaling2D(dist / this.lastDist, center)
		).rightMul(
			Mat33.translation(center.minus(this.lastCenter))
		);
		this.lastCenter = center;
		this.lastDist = dist;
		this.lastAngle = angle;

		this.transform.unapply(this.editor);
		this.transform = new Viewport.ViewportTransform(
			this.transform.transform.rightMul(transformUpdate)
		);
		this.transform.apply(this.editor);
	}

	onPointerUp(_pointer: Pointer, _allPointers: Pointer[]): void {
		this.transform.unapply(this.editor);
		this.editor.dispatch(this.transform);
	}

	onGestureCancel(): void {
		this.transform.unapply(this.editor);
	}
}
