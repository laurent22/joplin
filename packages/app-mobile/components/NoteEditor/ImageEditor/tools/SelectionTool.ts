import Command from "../commands/Command";
import AbstractComponent from "../components/AbstractComponent";
import ImageEditor from "../editor";
import Mat33 from "../geometry/Mat33";
//import Mat33 from "../geometry/Mat33";
import Rect2 from "../geometry/Rect2";
import { Point2, Vec2 } from "../geometry/Vec2";
import { EditorEventType, PointerEvt } from "../types";
import BaseTool from "./BaseTool";
import { ToolType } from "./ToolController";

const styles = `
	.handleOverlay {
		position: absolute;
		top: 0;
		left: 0;
	}

	.handleOverlay > .selectionBox {
		position: fixed;
		z-index: 0;
		background-color: rgba(255, 100, 255, 0.5);
		border: 1px solid #ffccff;
	}
`;

type DragCallback = (delta: Vec2)=>void;
type DragEndCallback = ()=>void;

const makeDraggable = (element: HTMLElement, onDrag: DragCallback, onDragEnd: DragEndCallback) => {
	element.style.touchAction = 'none';
	let down = false;

	// Work around a Safari bug
	element.addEventListener('touchstart', evt => evt.preventDefault());

	let lastX: number;
	let lastY: number;
	element.addEventListener('pointerdown', event => {
		if (event.isPrimary) {
			down = true;
			element.setPointerCapture(event.pointerId);
			lastX = event.pageX;
			lastY = event.pageY;
			return true;
		}
		return false;
	});
	element.addEventListener('pointermove', event => {
		if (event.isPrimary && down) {
			// Safari/iOS doesn't seem to support movementX/movementY on pointer events.
			// Calculate manually:
			const delta = Vec2.of(event.pageX - lastX, event.pageY - lastY);
			onDrag(delta);
			lastX = event.pageX;
			lastY = event.pageY;
			return true;
		}
		return false;
	});
	const onPointerEnd = (event: PointerEvent) => {
		if (event.isPrimary) {
			down = false;
			onDragEnd();
			return true;
		}
		return false;
	};
	element.addEventListener('pointerup', onPointerEnd);
	element.addEventListener('pointercancel', onPointerEnd);
};

class Selection {
	private region: Rect2;
	private boxRotation: number;
	//private transform: Mat33;
	private backgroundBox: HTMLElement;
	private selectedElems: AbstractComponent[];

	public constructor(
		public startPoint: Point2, private editor: ImageEditor
	) {
		//this.transform = Mat33.identity;
		this.boxRotation = 0;
		this.selectedElems = [];
		this.region = Rect2.bboxOf([ startPoint ]);

		// Create draggable rectangles
		this.backgroundBox = document.createElement('div');
		this.backgroundBox.classList.add('selectionBox');

		let transformationCommands: Command[] = [];
		let transform = Mat33.identity;
		makeDraggable(this.backgroundBox, (deltaPosition: Vec2) => {
			deltaPosition = this.editor.viewport.screenToCanvasTransform.transformVec3(
				deltaPosition,
			);
			// TODO: Make transform undo-able
			this.region = this.region.translatedBy(deltaPosition);
			transform = transform.rightMul(Mat33.translation(deltaPosition));

			transformationCommands.forEach(cmd => cmd.unapply(this.editor));
			transformationCommands = this.selectedElems.map(elem => {
				return elem.transformBy(transform);
			});
			transformationCommands.forEach(cmd => cmd.apply(this.editor));

			this.updateUI();
		}, () => {
			transformationCommands.forEach(cmd => {
				cmd.unapply(this.editor);
			});

			const fullTransform = transform;
			const inverseTransform = transform.inverse();

			// Reset for the next drag
			transform = Mat33.identity;
			transformationCommands = [];
			this.region = this.region.transformedBoundingBox(inverseTransform);

			const elems = this.selectedElems;
			this.editor.dispatch({
				apply: (editor) => {
					elems.forEach(elem => {
						elem.transformBy(fullTransform).apply(editor);
					});
					this.region = this.region.transformedBoundingBox(fullTransform);
					this.updateUI();
				},
				unapply: (editor) => {
					elems.forEach(elem => {
						elem.transformBy(inverseTransform).apply(editor);
					});
					this.region = this.region.transformedBoundingBox(inverseTransform);
					this.updateUI();
				},
			});
		});
	}

	public appendBackgroundBoxTo(elem: HTMLElement) {
		if (this.backgroundBox.parentElement) {
			this.backgroundBox.remove();
		}

		elem.appendChild(this.backgroundBox);
	}

	public setToPoint(point: Point2) {
		this.region = Rect2.fromCorners(point, this.startPoint);
		this.updateUI();
	}

	public cancelSelection() {
		if (this.backgroundBox.parentElement) {
			this.backgroundBox.remove();
		}
	}

	// Find the objects corresponding to this in the document,
	// select them.
	// Returns false iff nothing was selected.
	public resolveToObjects(): boolean {
		// Grow the rectangle, if necessary
		if (this.region.w === 0 || this.region.h === 0) {
			const padding = this.editor.viewport.visibleRect.maxDimension / 100;
			this.region = Rect2.bboxOf(this.region.corners, padding);
		}

		this.selectedElems = this.editor.image.getElementsIntersectingRegion(this.region).filter(elem => {
			if (this.region.containsRect(elem.getBBox())) {
				return true;
			} else if (this.region.getEdges().some(edge => elem.intersects(edge))) {
				return true;
			}
			return false;
		});

		// Find the bounding box of all selected elements.
		const newRegion = this.selectedElems.reduce((
			accumulator: Rect2|null, elem: AbstractComponent
		): Rect2 => {
			return (accumulator ?? elem.getBBox()).union(elem.getBBox());
		}, null);

		if (!newRegion) {
			this.cancelSelection();
			return false;
		}

		this.region = newRegion;
		this.updateUI();
		return true;
	}

	public updateUI() {
		if (!this.backgroundBox) {
			return;
		}

		const rect = this.region.transformedBoundingBox(
			this.editor.viewport.canvasToScreenTransform
		);
		this.backgroundBox.style.left = `${rect.x}px`;
		this.backgroundBox.style.top = `${rect.y}px`;
		this.backgroundBox.style.width = `${rect.w}px`;
		this.backgroundBox.style.height = `${rect.h}px`;

		const rotationDeg = this.boxRotation * 180 / Math.PI;
		this.backgroundBox.style.transform = `rotate(${rotationDeg}deg)`;
	};
}

export default class SelectionTool extends BaseTool {
	private handleOverlay: HTMLElement;
	private selectionBox: Selection|null;
	public readonly kind: ToolType = ToolType.Selection;

	public constructor(private editor: ImageEditor) {
		super(editor.notifier);

		this.handleOverlay = document.createElement('div');
		editor.createHTMLOverlay(this.handleOverlay);
		editor.addStyleSheet(styles);

		this.handleOverlay.style.display = 'none';
		this.handleOverlay.classList.add('handleOverlay');

		editor.notifier.on(EditorEventType.ViewportChanged, _data => {
			if (this.selectionBox) {
				this.selectionBox.updateUI();
			}
		});
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1) {
			this.selectionBox = new Selection(
				event.current.canvasPos, this.editor,
			);
			// Remove any previous selection rects
			this.handleOverlay.replaceChildren();
			this.selectionBox.appendBackgroundBoxTo(this.handleOverlay);

			return true;
		}
		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		this.selectionBox.setToPoint(event.current.canvasPos);
	}

	public onPointerUp(event: PointerEvt): void {
		this.selectionBox.setToPoint(event.current.canvasPos);

		// Expand/shrink the selection rectangle, if applicable
		this.selectionBox.resolveToObjects();
	}

	public onGestureCancel(): void {
		this.selectionBox.cancelSelection();
	}

	public setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		this.handleOverlay.style.display = enabled ? 'block' : 'none';
	}
}
