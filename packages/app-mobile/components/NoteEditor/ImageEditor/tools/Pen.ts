import Color4 from '../Color4';
import ImageEditor from '../editor';
import EditorImage from '../EditorImage';
import StrokeBuilder from '../StrokeBuilder';
import { Pointer, PointerDevice, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

const pressureToWidthMultiplier = 4.0;

export default class Pen extends BaseTool {
	private builder: StrokeBuilder;
	private color: Color4 = Color4.ofRGBA(1.0, 0.0, 0.5, 0.3);
	public readonly kind: ToolType = ToolType.Pen;

	public constructor(private editor: ImageEditor) {
		super(editor.notifier);
	}

	private getPressureMultiplier() {
		return 1 / this.editor.viewport.getScaleFactor() * pressureToWidthMultiplier;
	}

	private getStrokePoint(pointer: Pointer) {
		const pressure = pointer.pressure ?? 1.0;
		return {
			pos: pointer.canvasPos,
			width: pressure * this.getPressureMultiplier(),
			color: this.color,
			time: pointer.timeStamp,
		};
	}

	private addPointToStroke(pointer: Pointer) {
		this.editor.clearWetInk();
		this.editor.drawWetInk(...this.builder.preview());

		this.builder.addPoint(this.getStrokePoint(pointer));
	}

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (allPointers.length === 1 || current.device === PointerDevice.Pen) {
			this.builder = new StrokeBuilder(this.getStrokePoint(current));
			return true;
		}

		return false;
	}

	public onPointerMove({ current }: PointerEvt): void {
		this.addPointToStroke(current);
	}

	public onPointerUp({ current }: PointerEvt): void {
		if (!this.builder) {
			return;
		}

		this.addPointToStroke(current);
		if (this.builder && current.isPrimary) {
			const stroke = this.builder.build();
			const canFlatten = true;
			const action = new EditorImage.AddElementCommand(stroke, canFlatten);
			this.editor.dispatch(action);
		}
		this.builder = null;
		this.editor.clearWetInk();
	}

	public onGestureCancel(): void {
		this.editor.clearWetInk();
	}

}
