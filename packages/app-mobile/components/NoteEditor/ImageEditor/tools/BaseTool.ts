import { PointerEvtListener, WheelEvt, PointerEvt } from '../types';
import { ToolType } from './ToolController';

export default abstract class BaseTool implements PointerEvtListener {
	protected enabled: boolean = true;

	public abstract onPointerDown(event: PointerEvt): boolean;
	public abstract onPointerMove(event: PointerEvt): void;
	public abstract onPointerUp(event: PointerEvt): void;
	public abstract onGestureCancel(): void;
	public readonly kind: ToolType;

	public onWheel(_event: WheelEvt): boolean {
		return false;
	}

	public setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}
}

