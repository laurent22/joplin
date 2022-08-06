
import EditorImage from './EditorImage';
import ToolController from './tools/ToolController';
import { Pointer, PointerDevice, InputEvtType, PointerEvt, EditorNotifier, EditorEventType } from './types';
import Command from './commands/Command';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from '@joplin/lib/EventDispatcher';
import { Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import HTMLToolbar from './toolbar/HTMLToolbar';
import { RenderablePathSpec } from './rendering/AbstractRenderer';
import Display, { RenderingMode } from './Display';
import SVGRenderer from './rendering/SVGRenderer';
import Color4 from './Color4';

export class ImageEditor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private renderingRegion: HTMLElement;

	public history: UndoRedoHistory;
	public display: Display;
	public image: EditorImage;

	// Viewport for the exported/imported image
	private importExportViewport: Viewport;

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
		this.importExportViewport = new Viewport(this.notifier);
		this.viewport = new Viewport(this.notifier);
		this.display = new Display(this, renderingMode, this.renderingRegion);
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this);
		this.toolController = new ToolController(this);

		new HTMLToolbar(this, this.container);
		parent.appendChild(this.container);

		// Default to a 1000x1500 image
		this.importExportViewport.updateScreenSize(Vec2.of(1000, 1500));

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
				timeStamp: (new Date()).getTime(),
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
			const nowTime = (new Date()).getTime();

			const res = [];
			for (const id in pointers) {
				const maxUnupdatedTime = 2000; // Maximum time without a pointer update (ms)
				if (pointers[id] && (nowTime - pointers[id].timeStamp) < maxUnupdatedTime) {
					res.push(pointers[id]);
				}
			}
			return res;
		};

		// May be required to prevent text selection on iOS/Safari:
		// See https://stackoverflow.com/a/70992717/17055750
		this.renderingRegion.addEventListener('touchstart', evt => evt.preventDefault());

		this.renderingRegion.addEventListener('pointerdown', evt => {
			const pointer = pointerFor(evt, true);
			pointers[pointer.id] = pointer;

			this.renderingRegion.setPointerCapture(pointer.id);
			const event: PointerEvt = {
				kind: InputEvtType.PointerDownEvt,
				current: pointer,
				allPointers: getPointerList(),
			};
			if (this.toolController.dispatchInputEvent(event)) {
				evt.preventDefault();
			}

			return true;
		});

		this.renderingRegion.addEventListener('pointermove', evt => {
			const pointer = pointerFor(evt, pointers[evt.pointerId]?.down ?? false);
			if (pointer.down) {
				pointers[pointer.id] = pointer;

				if (this.toolController.dispatchInputEvent({
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
			if (this.toolController.dispatchInputEvent({
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
			if (this.toolController.dispatchInputEvent({
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
					this.display.height
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

		// Draw a rectangle around the region that will be visible on save
		const renderer = this.display.getDryInkRenderer();
		const exportRectFill = { color: Color4.fromHex('#44444455') };
		const exportRectStrokeWidth = 12;
		renderer.drawRect(
			this.importExportViewport.visibleRect,
			exportRectStrokeWidth,
			exportRectFill
		);

		this.image.render(renderer, this.viewport);
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
		const viewport = this.importExportViewport;
		const result = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const renderer = new SVGRenderer(result, viewport);

		// Render **all** elements.
		this.image.renderAll(renderer);

		// Just show the main region
		const rect = viewport.visibleRect;
		result.setAttribute('viewBox', `${rect.x} ${rect.y} ${rect.w} ${rect.h}`);
		result.setAttribute('width', `${rect.w}`);
		result.setAttribute('height', `${rect.w}`);


		return result;
	}
}

export default ImageEditor;
