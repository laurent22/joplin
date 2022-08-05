import { PointerEvt } from "../types";
import BaseTool from "./BaseTool";
import ImageEditor from '../editor';
import { Point2 } from "../geometry/Vec2";
import LineSegment2 from "../geometry/LineSegment2";
import Erase from "../commands/Erase";
import { ToolType } from "./ToolController";
import AbstractComponent from "../components/AbstractComponent";

export default class Eraser extends BaseTool {
	private lastPoint: Point2;
	private command: Erase;
	public kind: ToolType = ToolType.Eraser;
	private toRemove: AbstractComponent[];

	public constructor(private editor: ImageEditor) {
		super(editor.notifier);
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1) {
			this.lastPoint = event.current.canvasPos;
			this.toRemove = [];
			return true;
		}

		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		const currentPoint = event.current.canvasPos;
		if (currentPoint.minus(this.lastPoint).magnitude() === 0) {
			return;
		}

		const line = new LineSegment2(this.lastPoint, currentPoint);
		const region = line.bbox;

		// Remove any intersecting elements.
		this.toRemove.push(...this.editor.image
			.getElementsIntersectingRegion(region).filter(component => {
				return component.intersects(line);
			}));

		this.command?.unapply(this.editor);
		this.command = new Erase(this.toRemove);
		this.command.apply(this.editor);

		this.lastPoint = currentPoint;
	}

	public onPointerUp(_event: PointerEvt): void {
		if (this.command && this.toRemove.length > 0) {
			this.command?.unapply(this.editor);

			// Dispatch the command to make it undo-able
			this.editor.dispatch(this.command);
		}
		this.command = null;
	}

	public onGestureCancel(): void {
		this.command?.unapply(this.editor);
		this.command = null;
	}
}
