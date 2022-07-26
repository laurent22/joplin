
import EditorImage from './EditorImage';
import ToolController from './tools/ToolController';
import { Pointer, PointerDevice, InputEvtType, PointerEvt, EditorNotifier, EditorEventType } from './types';
import Command from "./commands/Command";
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from '@joplin/lib/EventDispatcher';
import { Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import HTMLToolbar from './toolbar/HTMLToolbar';
import { RenderablePathSpec } from './rendering/AbstractRenderer';
import Display, { RenderingMode } from './Display';

export class ImageEditor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private renderingRegion: HTMLElement;

	public history: UndoRedoHistory;
	public display: Display;
	public image: EditorImage;

	public viewport: Viewport;
	public toolController: ToolController;
	public notifier: EditorNotifier;

	public constructor(parent: HTMLElement, renderingMode: RenderingMode = RenderingMode.CanvasRenderer) {
		this.container = document.createElement('div');
		this.renderingRegion = document.createElement('div');
		this.container.appendChild(this.renderingRegion);
		this.container.className = 'imageEditorContainer';

		this.renderingRegion.style.touchAction = 'none';
		this.renderingRegion.className = 'imageEditorRenderArea';

		this.notifier = new EventDispatcher();
		this.viewport = new Viewport(this.notifier);
		this.display = new Display(this, renderingMode, this.renderingRegion);
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this);
		this.toolController = new ToolController(this);

		new HTMLToolbar(this, this.container);
		parent.appendChild(this.container);

		this.viewport.updateScreenSize(
			Vec2.of(this.display.width, this.display.height)
		);

		this.registerListeners();
		this.rerender();
	}

	private registerListeners() {
		const pointerTypeToDevice: Record<string, PointerDevice> = {
			'mouse': PointerDevice.Mouse,
			'pen': PointerDevice.Pen,
			'touch': PointerDevice.Touch,
		};

		const pointerFor = (evt: PointerEvent, isDown: boolean): Pointer => {
			const screenPos = Vec2.of(evt.clientX, evt.clientY);
			const device = pointerTypeToDevice[evt.pointerType] ?? PointerDevice.Other;

			return {
				timeStamp: evt.timeStamp,
				isPrimary: evt.isPrimary,
				down: isDown,
				id: evt.pointerId,
				pressure: evt.pressure,
				screenPos,
				device,
				canvasPos: this.viewport.screenToCanvas(screenPos),
			};
		};

		const pointers: Record<number, Pointer> = {};
		const getPointerList = () => {
			const res = [];
			for (const id in pointers) {
				if (pointers[id]) {
					res.push(pointers[id]);
				}
			}
			return res;
		};

		this.renderingRegion.addEventListener('pointerdown', evt => {
			const pointer = pointerFor(evt, true);
			pointers[pointer.id] = pointer;

			this.renderingRegion.setPointerCapture(pointer.id);
			const event: PointerEvt = {
				kind: InputEvtType.PointerDownEvt,
				current: pointer,
				allPointers: getPointerList(),
			};
			if (this.toolController.dispatchEvent(event)) {
				evt.preventDefault();
			}

			return true;
		});

		this.renderingRegion.addEventListener('pointermove', evt => {
			const pointer = pointerFor(evt, pointers[evt.pointerId]?.down ?? false);
			if (pointer.down) {
				pointers[pointer.id] = pointer;

				if (this.toolController.dispatchEvent({
					kind: InputEvtType.PointerMoveEvt,
					current: pointer,
					allPointers: getPointerList(),
				})) {
					evt.preventDefault();
				}
			}
		});

		const pointerEnd = (evt: PointerEvent) => {
			const pointer = pointerFor(evt, false);
			if (!pointers[pointer.id]) {
				return;
			}

			pointers[pointer.id] = pointer;
			this.renderingRegion.releasePointerCapture(pointer.id);
			if (this.toolController.dispatchEvent({
				kind: InputEvtType.PointerUpEvt,
				current: pointer,
				allPointers: getPointerList(),
			})) {
				evt.preventDefault();
			}
			delete pointers[pointer.id];
		};

		this.renderingRegion.addEventListener('pointerup', evt => {
			pointerEnd(evt);
		});

		this.renderingRegion.addEventListener('pointercancel', evt => {
			pointerEnd(evt);
		});

		this.container.addEventListener('wheel', evt => {
			let delta = Vec3.of(evt.deltaX, evt.deltaY, evt.deltaZ);

			if (evt.deltaMode === WheelEvent.DOM_DELTA_LINE) {
				delta = delta.times(15);
			} else if (evt.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
				delta = delta.times(100);
			}

			if (evt.ctrlKey) {
				delta = Vec3.of(0, 0, evt.deltaY);
			}

			const pos = Vec2.of(evt.clientX, evt.clientY);
			if (this.toolController.dispatchEvent({
				kind: InputEvtType.WheelEvt,
				delta,
				screenPos: pos,
			})) {
				evt.preventDefault();
			}
		});

		window.addEventListener('resize', () => {
			this.notifier.dispatch(EditorEventType.DisplayResized, {
				kind: EditorEventType.DisplayResized,
				newSize: Vec2.of(
					this.display.width,
					this.display.height,
				),
			});
			this.viewport.updateScreenSize(
				Vec2.of(this.display.width, this.display.height)
			);
			this.queueRerender();
		});
	}

	public dispatch(command: Command) {
		// .push applies [command] to this
		this.history.push(command);
	}

	private rerenderQueued: boolean = false;
	public queueRerender() {
		if (!this.rerenderQueued) {
			this.rerenderQueued = true;
			requestAnimationFrame(() => {
				this.rerender();
				this.rerenderQueued = false;
			});
		}
	}

	public rerender() {
		this.display.startRerender();
		this.image.render(
			this.display.getDryInkRenderer(), this.viewport
		);
	}

	public drawWetInk(...path: RenderablePathSpec[]) {
		for (const part of path) {
			this.display.getWetInkRenderer().drawPath(part);
		}
	}

	public clearWetInk() {
		this.display.getWetInkRenderer().clear();
	}

	public createHTMLOverlay(overlay: HTMLElement) {
		overlay.classList.add('overlay');
		this.container.appendChild(overlay);

		return {
			remove: () => overlay.remove(),
		};
	}

	public addStyleSheet(content: string): HTMLStyleElement {
		const styleSheet = document.createElement('style');
		styleSheet.innerText = content;
		this.container.appendChild(styleSheet);

		return styleSheet;
	}

	public toSVG(): SVGElement {
		// TODO
		throw new Error('TODO: Implement');
		return null;
	}
}

export default ImageEditor;
