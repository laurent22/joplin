import Color4 from '../Color4';
import ImageEditor from '../editor';
import EditorImage, { AddElementCommand } from '../EditorImage';
import Stroke from '../Stroke';
import { Pointer, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

const pressureToWidthMultiplier = 4.0;

export default class Pen extends BaseTool {
	private strokeAction: AddElementCommand;
	private stroke: Stroke;
	private color: Color4 = Color4.ofRGBA(1.0, 0.0, 0.5, 0.3);
	public readonly type: ToolType = ToolType.Pen;

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

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
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

	public onPointerMove({ current, allPointers }: PointerEvt): void {
		if (allPointers.length !== 1 || !current.down) {
			return;
		}

		this.addPointToStroke(current);
	}

	public onPointerUp({ current, allPointers }: PointerEvt): void {
		if (allPointers.length > 1) {
			return;
		}

		this.addPointToStroke(current);
		if (this.strokeAction && current.isPrimary) {
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
