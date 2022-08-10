import Color4 from '../Color4';
import SVGEditor from '../SVGEditor';
import EditorImage from '../EditorImage';
import { Vec2 } from '../geometry/Vec2';
import Pointer, { PointerDevice } from '../Pointer';
import StrokeBuilder from '../StrokeBuilder';
import { EditorEventType, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

export default class Pen extends BaseTool {
	private builder: StrokeBuilder;
	public readonly kind: ToolType = ToolType.Pen;

	public constructor(
		private editor: SVGEditor,
		private color: Color4 = Color4.purple,
		private thickness: number = 16.0
	) {
		super(editor.notifier);
	}

	private getPressureMultiplier() {
		return 1 / this.editor.viewport.getScaleFactor() * this.thickness;
	}

	private getStrokePoint(pointer: Pointer) {
		const minPressure = 0.3;
		const pressure = Math.max(pointer.pressure ?? 1.0, minPressure);
		return {
			pos: pointer.canvasPos,
			width: pressure * this.getPressureMultiplier(),
			color: this.color,
			time: pointer.timeStamp,
		};
	}

	private addPointToStroke(pointer: Pointer) {
		this.builder.addPoint(this.getStrokePoint(pointer));

		this.editor.clearWetInk();
		this.editor.drawWetInk(...this.builder.preview());
	}

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (allPointers.length === 1 || current.device === PointerDevice.Pen) {
			// Don't smooth if input is more than ± 7 pixels from the true curve, do smooth if
			// less than ± 2 px from the curve.
			const canvasTransform = this.editor.viewport.screenToCanvasTransform;
			const maxSmoothingDist = canvasTransform.transformVec3(Vec2.unitX).magnitude() * 7;
			const minSmoothingDist = canvasTransform.transformVec3(Vec2.unitX).magnitude() * 2;

			this.builder = new StrokeBuilder(
				this.getStrokePoint(current), minSmoothingDist, maxSmoothingDist
			);
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

			this.editor.clearWetInk();
			this.editor.drawWetInk(...this.builder.preview());

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

	private noteUpdated() {
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}

	public setColor(color: Color4): void {
		if (color.toHexString() !== this.color.toHexString()) {
			this.color = color;
			this.noteUpdated();
		}
	}

	public setThickness(thickness: number) {
		if (thickness !== this.thickness) {
			this.thickness = thickness;
			this.noteUpdated();
		}
	}

	public getThickness() { return this.thickness; }
	public getColor() { return this.color; }
}
