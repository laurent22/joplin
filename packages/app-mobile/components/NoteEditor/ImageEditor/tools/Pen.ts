import Color4 from '../Color4';
import ImageEditor from '../editor';
import EditorImage, { AddElementCommand } from '../EditorImage';
import Stroke from '../Stroke';
import { Pointer } from '../types';
import BaseTool from './BaseTool';

const pressureToWidthMultiplier = 4.0;

export default class Pen extends BaseTool {
	private strokeAction: AddElementCommand;
	private stroke: Stroke;
	private color: Color4 = Color4.ofRGBA(1.0, 0.0, 0.5, 0.3);

	public constructor(private editor: ImageEditor) { super(); }

	private getPressureMultiplier() {
		return 1 / this.editor.viewport.getScaleFactor() * pressureToWidthMultiplier;
	}

	private addPointToStroke(pointer: Pointer) {
		if (this.strokeAction == null) {
			this.strokeAction = new EditorImage.AddElementCommand(this.stroke);
		}

		this.strokeAction.unapply(this.editor);
		this.stroke.addPoint({
			pos: pointer.canvasPos,
			width: (pointer.pressure ?? 1.0) * this.getPressureMultiplier(),
			color: this.color,
		});
		this.strokeAction = new EditorImage.AddElementCommand(this.stroke);
		this.strokeAction.apply(this.editor);
	}

	public onPointerDown(current: Pointer, allPointers: Pointer[]): boolean {
		if (allPointers.length === 1) {
			this.stroke = new Stroke({
				pos: current.canvasPos,
				width: (current.pressure ?? 1.0) * this.getPressureMultiplier(),
				color: this.color,
			});
			return true;
		}

		return false;
	}

	public onPointerMove(current: Pointer, allPointers: Pointer[]): void {
		if (allPointers.length !== 1 || !current.down) {
			return;
		}

		this.addPointToStroke(current);
	}

	public onPointerUp(pointer: Pointer, allPointers: Pointer[]): void {
		if (allPointers.length > 1) {
			return;
		}

		this.addPointToStroke(pointer);
		if (this.strokeAction && pointer.isPrimary) {
			this.strokeAction.unapply(this.editor);
			this.editor.dispatch(this.strokeAction);
			console.log('Added stroke');
		}
		this.strokeAction = null;
	}
	public onGestureCancel(): void {
		this.strokeAction?.unapply(this.editor);
		this.strokeAction = null;
	}

}
