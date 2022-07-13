import { Vec3 } from '../math';
import { Pointer, PointerEventListener } from '../types';

export enum ToolType {
	Pen,
	PanZoom,
}

export default abstract class BaseTool implements PointerEventListener {
	protected enabled: boolean = true;

	public abstract onPointerDown(current: Pointer, allPointers: Pointer[]): boolean;
	public abstract onPointerMove(current: Pointer, allPointers: Pointer[]): void;
	public abstract onPointerUp(pointer: Pointer, allPointers: Pointer[]): void;
	public abstract onGestureCancel(): void;

	public onWheel(_delta: Vec3): boolean {
		return false;
	}

	public setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}
}
