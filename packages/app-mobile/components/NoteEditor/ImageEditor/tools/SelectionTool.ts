import Command from '../commands/Command';
import AbstractComponent from '../components/AbstractComponent';
import ImageEditor from '../editor';
import Mat33 from '../geometry/Mat33';
// import Mat33 from "../geometry/Mat33";
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import { EditorEventType, PointerEvt } from '../types';
import Viewport from '../Viewport';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

const handleScreenSize = 30;
const styles = `
	.handleOverlay {
		position: absolute;
		top: 0;
		left: 0;
	}

	.handleOverlay > .selectionBox {
		position: fixed;
		z-index: 0;
		transform-origin: center;
	}

	.handleOverlay > .selectionBox .draggableBackground {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;

		background-color: rgba(255, 100, 255, 0.5);
		border: 1px solid #ffccff;
	}

	.handleOverlay > .selectionBox .resizeCorner {
		width: ${handleScreenSize}px;
		height: ${handleScreenSize}px;
		margin-right: -${handleScreenSize / 2}px;
		margin-bottom: -${handleScreenSize / 2}px;

		position: absolute;
		bottom: 0;
		right: 0;

		opacity: 0.8;
		background-color: white;
		border: 1px solid black;
	}

	.handleOverlay > .selectionBox .rotateCircleContainer {
		position: absolute;
		top: 50%;
		bottom: 50%;
		left: 50%;
		right: 50%;
	}

	.handleOverlay .rotateCircle {
		width: ${handleScreenSize}px;
		height: ${handleScreenSize}px;
		margin-left: -${handleScreenSize / 2}px;
		margin-top: -${handleScreenSize / 2}px;
		opacity: 0.8;

		border: 1px solid black;
		background-color: white;
		border-radius: 100%;
	}
`;

type DragCallback = (delta: Vec2, offset: Point2)=> void;
type DragEndCallback = ()=> void;

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
			onDrag(delta, Vec2.of(event.offsetX, event.offsetY));
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
	public region: Rect2;
	private boxRotation: number;
	private backgroundBox: HTMLElement;
	private rotateCircle: HTMLElement;
	private selectedElems: AbstractComponent[];

	public constructor(
		public startPoint: Point2, private editor: ImageEditor
	) {
		this.boxRotation = this.editor.viewport.getRotationAngle();
		this.selectedElems = [];
		this.region = Rect2.bboxOf([startPoint]);

		// Create draggable rectangles
		this.backgroundBox = document.createElement('div');
		const draggableBackground = document.createElement('div');
		const resizeCorner = document.createElement('div');
		this.rotateCircle = document.createElement('div');
		const rotateCircleContainer = document.createElement('div');

		this.backgroundBox.classList.add('selectionBox');
		draggableBackground.classList.add('draggableBackground');
		resizeCorner.classList.add('resizeCorner');
		this.rotateCircle.classList.add('rotateCircle');
		rotateCircleContainer.classList.add('rotateCircleContainer');

		rotateCircleContainer.appendChild(this.rotateCircle);

		this.backgroundBox.appendChild(draggableBackground);
		this.backgroundBox.appendChild(rotateCircleContainer);
		this.backgroundBox.appendChild(resizeCorner);

		let transformationCommands: Command[] = [];
		let transform = Mat33.identity;

		// Maximum number of strokes to transform without a re-render.
		const updateChunkSize = 20;

		// Apply a large transformation in chunks.
		const asyncTransformElems = async (
			editor: ImageEditor, elems: AbstractComponent[], transformBy: Mat33
		) => {
			for (let i = 0; i < elems.length; i += updateChunkSize) {
				editor.showLoadingWarning(i / elems.length);

				for (let j = i; j < elems.length && j < i + updateChunkSize; j++) {
					const elem = elems[j];
					elem.transformBy(transformBy).apply(editor);
				}

				// Re-render to show progress, but only if we're not done.
				if (i + updateChunkSize < elems.length) {
					await new Promise(resolve => {
						editor.rerender();
						requestAnimationFrame(resolve);
					});
				}
			}
			editor.hideLoadingWarning();
		};

		const applyTransformCmds = () => {
			transformationCommands.forEach(cmd => {
				cmd.unapply(this.editor);
			});

			const fullTransform = transform;
			const inverseTransform = transform.inverse();
			const deltaBoxRotation = this.boxRotation;

			// Reset for the next drag
			transform = Mat33.identity;
			transformationCommands = [];
			this.region = this.region.transformedBoundingBox(inverseTransform);

			const elems = this.selectedElems;
			this.editor.dispatch({
				apply: async (editor) => {
					// Approximate the new selection
					this.region = this.region.transformedBoundingBox(fullTransform);
					this.boxRotation += deltaBoxRotation;
					this.updateUI();

					await asyncTransformElems(editor, elems, fullTransform);
					this.recomputeRegion();
					this.updateUI();
				},
				unapply: async (editor) => {
					this.region = this.region.transformedBoundingBox(inverseTransform);
					this.boxRotation -= deltaBoxRotation;
					this.updateUI();

					await asyncTransformElems(editor, elems, inverseTransform);
					this.recomputeRegion();
					this.updateUI();
				},
			});
		};

		const previewTransformCmds = () => {
			// Don't render what we're moving if it's likely to be slow.
			if (this.selectedElems.length > updateChunkSize) {
				this.updateUI();
				return;
			}

			transformationCommands.forEach(cmd => cmd.unapply(this.editor));
			transformationCommands = this.selectedElems.map(elem => {
				return elem.transformBy(transform);
			});
			transformationCommands.forEach(cmd => cmd.apply(this.editor));

			this.updateUI();
		};

		makeDraggable(draggableBackground, (deltaPosition: Vec2) => {
			// Re-scale the change in position
			// (use a Vec3 transform to avoid translating deltaPosition)
			deltaPosition = this.editor.viewport.screenToCanvasTransform.transformVec3(
				deltaPosition
			);

			// Snap position to a multiple of 10 (additional decimal points lead to larger files).
			deltaPosition = this.editor.viewport.roundPoint(deltaPosition);

			this.region = this.region.translatedBy(deltaPosition);
			transform = transform.rightMul(Mat33.translation(deltaPosition));

			previewTransformCmds();
		}, applyTransformCmds);

		makeDraggable(resizeCorner, (deltaPosition) => {
			deltaPosition = this.editor.viewport.screenToCanvasTransform.transformVec3(
				deltaPosition
			);

			const oldWidth = this.region.w;
			const oldHeight = this.region.h;
			const newSize = this.region.size.plus(deltaPosition);

			if (newSize.y > 0 && newSize.x > 0) {
				this.region = this.region.resizedTo(newSize);
				const scaleFactor = Vec2.of(this.region.w / oldWidth, this.region.h / oldHeight);

				const currentTransfm = Mat33.scaling2D(scaleFactor, this.region.topLeft);
				transform = transform.rightMul(currentTransfm);
				previewTransformCmds();
			}
		}, applyTransformCmds);

		makeDraggable(this.rotateCircle, (_deltaPosition, offset) => {
			this.boxRotation = this.boxRotation % (2 * Math.PI);
			if (this.boxRotation < 0) {
				this.boxRotation += 2 * Math.PI;
			}

			let targetRotation = offset.angle();
			targetRotation = targetRotation % (2 * Math.PI);
			if (targetRotation < 0) {
				targetRotation += 2 * Math.PI;
			}

			let deltaRotation = (targetRotation - this.boxRotation);

			const rotationStep = Math.PI / 12;
			if (Math.abs(deltaRotation) < rotationStep || !isFinite(deltaRotation)) {
				return;
			} else {
				const rotationDirection = Math.sign(deltaRotation);

				// Step exactly one rotationStep
				deltaRotation = Math.floor(Math.abs(deltaRotation) / rotationStep) * rotationStep;
				deltaRotation *= rotationDirection;
			}

			const oldTransform = transform;
			transform = transform.rightMul(Mat33.zRotation(deltaRotation, this.region.center));

			// TODO: Fix this. Currently, this works around a bug in which transform might not
			// be invertable...
			if (
				!transform.transformVec2(
					transform.inverse().transformVec2(Vec2.of(1,1))
				).eq(Vec2.of(1,1), 0.1)
			) {
				transform = oldTransform;
				console.error(
					'Uninvertable transform! Canceling rotation update.',
					'\nTransform:', transform,
					'\nΔϑ', deltaRotation,
					'\nCenter:', this.region.center
				);
				return;
			}

			this.boxRotation += deltaRotation;
			previewTransformCmds();
		}, applyTransformCmds);
	}

	public appendBackgroundBoxTo(elem: HTMLElement) {
		if (this.backgroundBox.parentElement) {
			this.backgroundBox.remove();
		}

		elem.appendChild(this.backgroundBox);
	}

	public setToPoint(point: Point2) {
		this.region = this.region.grownToPoint(point);
		this.recomputeBoxRotation();
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
		if (!this.recomputeRegion()) {
			return false;
		}
		this.updateUI();

		return true;
	}

	// Recompute this' region from the selected elements. Resets rotation to zero.
	// Returns false if the selection is empty.
	public recomputeRegion(): boolean {
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


		const minSize = this.getMinCanvasSize();
		if (this.region.w < minSize || this.region.h < minSize) {
			// Add padding
			const padding = minSize / 2;
			this.region = Rect2.bboxOf(
				this.region.corners, padding
			);
		}

		this.recomputeBoxRotation();
		return true;
	}

	public getMinCanvasSize(): number {
		const canvasHandleSize = handleScreenSize / this.editor.viewport.getScaleFactor();
		return canvasHandleSize * 2;
	}

	private recomputeBoxRotation() {
		this.boxRotation = this.editor.viewport.getRotationAngle();
	}

	public updateUI() {
		if (!this.backgroundBox) {
			return;
		}

		const rightSideDirection = this.region.topRight.minus(this.region.bottomRight);
		const topSideDirection = this.region.topLeft.minus(this.region.topRight);

		const toScreen = this.editor.viewport.canvasToScreenTransform;
		const centerOnScreen = toScreen.transformVec2(this.region.center);
		const heightOnScreen = toScreen.transformVec3(rightSideDirection).magnitude();
		const widthOnScreen = toScreen.transformVec3(topSideDirection).magnitude();

		this.backgroundBox.style.left = `${centerOnScreen.x - widthOnScreen / 2}px`;
		this.backgroundBox.style.top = `${centerOnScreen.y - heightOnScreen / 2}px`;
		this.backgroundBox.style.width = `${widthOnScreen}px`;
		this.backgroundBox.style.height = `${heightOnScreen}px`;

		const rotationDeg = this.boxRotation * 180 / Math.PI;

		this.backgroundBox.style.transform = `rotate(${rotationDeg}deg)`;
		this.rotateCircle.style.transform = `rotate(${-rotationDeg}deg)`;
	}
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
			this.selectionBox?.recomputeRegion();
			this.selectionBox?.updateUI();
		});
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 && event.current.isPrimary) {
			this.selectionBox = new Selection(
				event.current.canvasPos, this.editor
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

	private onGestureEnd() {
		// Expand/shrink the selection rectangle, if applicable
		this.selectionBox.resolveToObjects();

		const visibleRect = this.editor.viewport.visibleRect;
		const selectionRect = this.selectionBox.region;

		// Try to move the selection within the center 2/3rds of the viewport.
		const targetRect = visibleRect.transformedBoundingBox(
			Mat33.scaling2D(2 / 3, visibleRect.center)
		);

		// Ensure that the selection fits within the target
		if (targetRect.w < selectionRect.w || targetRect.h < selectionRect.h) {
			const multiplier = Math.max(
				selectionRect.w / targetRect.w, selectionRect.h / targetRect.h
			);
			const visibleRectTransform = Mat33.scaling2D(multiplier, targetRect.topLeft);
			const viewportContentTransform = visibleRectTransform.inverse();

			this.editor.dispatch(new Viewport.ViewportTransform(viewportContentTransform));
		}

		// Ensure that the top left is visible
		if (!targetRect.containsRect(selectionRect)) {
			// target position - current position
			const translation = selectionRect.center.minus(targetRect.center);
			const visibleRectTransform = Mat33.translation(translation);
			const viewportContentTransform = visibleRectTransform.inverse();

			this.editor.dispatch(new Viewport.ViewportTransform(viewportContentTransform));
		}
	}

	public onPointerUp(event: PointerEvt): void {
		this.selectionBox.setToPoint(event.current.canvasPos);
		this.onGestureEnd();
	}

	public onGestureCancel(): void {
		this.onGestureEnd();
	}

	public setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		// Clear the selection
		this.handleOverlay.replaceChildren();
		this.selectionBox = null;

		this.handleOverlay.style.display = enabled ? 'block' : 'none';
	}

	// Get the object responsible for displaying this' selection.
	public getSelection(): Selection {
		return this.selectionBox;
	}
}
