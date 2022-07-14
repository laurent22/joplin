
import Color4 from './Color4';
import EditorImage from './EditorImage';
import { Vec2, Vec3 } from './math';
import CanvasRenderer from './rendering/CanvasRenderer';
import Stroke from './Stroke';
import BaseTool from './tools/BaseTool';
import PanZoomTool from './tools/PanZoom';
import Pen from './tools/Pen';
import { Command, Pointer, PointerDevice } from './types';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';

export class ImageEditor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private canvasRenderer: CanvasRenderer;

	private history: UndoRedoHistory;
	public image: EditorImage;

	private tools: BaseTool[];
	private activeTool: BaseTool;

	// private toolbar: EditorToolbar;
	public viewport: Viewport;

	public constructor(parent: HTMLElement) {
		this.viewport = new Viewport();
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this);

		this.container = document.createElement('div');
		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext('2d');
		this.canvasRenderer = new CanvasRenderer(this.ctx, this.viewport);

		this.canvas.className = 'ink';

		this.container.replaceChildren(this.canvas);
		parent.appendChild(this.container);
		this.viewport.updateScreenSize(Vec2.of(this.canvas.width, this.canvas.height));

		this.tools = [
			new Pen(this),
			new PanZoomTool(this),
		];

		// Test image

		const stroke = new Stroke({
			pos: Vec2.of(20, 20),
			color: Color4.red,
			width: 20,
		});
		for (let i = 0; i < 20; i++) {
			stroke.addPoint({
				pos: Vec2.of(20 + i * 80, (Math.sin(i / 20 * 4 * 3.14) + 1.5) * 500),
				color: Color4.blue,
				width: 20 + Math.cos(i / 20 * 2 * 3.14) * 20,
			});
		}
		this.dispatch(new EditorImage.AddElementCommand(stroke));




		this.registerListeners();
		this.rerender();
	}

	private registerListeners() {
		const pointerTypeToDevice: Record<string, PointerDevice> = {
			'mouse': PointerDevice.Mouse,
			'pen': PointerDevice.Pen,
			'touch': PointerDevice.Touch,
		};

		const pointerFor = (evt: PointerEvent, isDown: boolean = true): Pointer => {
			const screenPos = Vec2.of(evt.clientX, evt.clientY);
			const device = pointerTypeToDevice[evt.pointerType] ?? PointerDevice.Other;

			return {
				timeStamp: evt.timeStamp,
				isPrimary: evt.isPrimary,
				down: isDown,
				id: evt.pointerId,
				screenPos,
				device,
				canvasPos: this.viewport.screenToCanvas(screenPos),
			};
		};

		const pointers: Record<number, Pointer> = [];
		const getPointerList = () => {
			const res = [];
			for (const id in pointers) {
				if (pointers[id]) {
					res.push(pointers[id]);
				}
			}
			return res;
		};

		this.container.addEventListener('pointerdown', evt => {
			const pointer = pointerFor(evt);
			pointers[pointer.id] = pointer;
			this.container.setPointerCapture(pointer.id);

			for (const tool of this.tools) {
				if (tool.isEnabled() && tool.onPointerDown(pointer, getPointerList())) {
					if (this.activeTool) {
						this.activeTool.onGestureCancel();
					}

					this.activeTool = tool;
					break;
				}
			}

			return true;
		});

		this.container.addEventListener('pointermove', evt => {
			const pointer = pointerFor(evt, pointers[evt.pointerId]?.down ?? false);
			if (pointer.down) {
				pointers[pointer.id] = pointer;
				this.activeTool?.onPointerMove(pointer, getPointerList());
			}

			return true;
		});

		const handlePointerEnd = (evt: PointerEvent) => {
			const pointer = pointerFor(evt, false);
			if (!pointers[pointer.id]) {
				return;
			}

			pointers[pointer.id] = pointer;
			this.container.releasePointerCapture(pointer.id);

			this.activeTool?.onPointerUp(pointer, getPointerList());

			pointers[pointer.id] = null;
		};

		this.container.addEventListener('pointerup', handlePointerEnd);

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

			for (const tool of this.tools) {
				if (tool.isEnabled() && tool.onWheel(delta, pos)) {
					evt.preventDefault();
					break;
				}
			}
		});

		window.addEventListener('resize', () => {
			this.rerender();
		});
	}

	public dispatch(command: Command) {
		// .push applies [command] to this
		this.history.push(command);
	}

	private resizeDrawingSurfaces() {
		if (this.canvas.clientWidth != this.canvas.width
				|| this.canvas.clientHeight != this.canvas.height) {
			this.canvas.width = this.canvas.clientWidth;
			this.canvas.height = this.canvas.clientHeight;
			this.viewport.updateScreenSize(Vec2.of(this.canvas.width, this.canvas.height));
		}
	}

	private rerenderQueued: boolean = false;
	public queueRerender() {
		if (!this.rerenderQueued) {
			this.rerenderQueued = true;
			requestAnimationFrame(() => {
				this.rerenderQueued = false;
				this.rerender();
			});
		}
	}

	public rerender() {
		this.resizeDrawingSurfaces();
		this.canvasRenderer.clear();
		this.image.render(this.canvasRenderer, this.viewport);
	}

	public toSVG(): SVGElement {
		return null;
	}
}

export default ImageEditor;

//
//
//
// class EditorToolbar {
// // Class name used for styling the toolbar container with CSS.
// private static containerClass = 'EditorToolbar';
//
// private buttons: Record<ToolID, HTMLButtonElement>;
// public constructor(readonly parent: HTMLElement,
// 					   readonly translationTable: Record<string, string>) {
// this.container = document.createElement('div');
// this.container.classList.add(EditorToolbar.containerClass);
// parent.appendChild(this.container);
// }
//
// public registerTool(tool: Tool) {
// // getButtonData() → ButtonDescription
// }
// }
//
// enum ToolID {
// Pen,
// Eraser,
// Zoom,
// }
//
// interface ButtonDescription {
// icon: string|Image|HTMLElement;
// longDescription: string;
// shortDescription: string;
// }
//
// abstract class Tool {
// public constructor(public readonly id: ToolID) {
// }
//
// /**
// 	 * Register [listener], which is called whenever the tool can/can no longer
// 	 * be enabled.
// 	 * /
// public setOnDisabledChangedListener(listener: (disabled: boolean)=>void) { }
//
// /**
// 	 * @return how this tool's toolbar button should look/behave.
// 	 * /
// public abstract getButtonData(): ButtonDescription;
//
// /**
// 	 * Called when the user activates this tool (e.g. clicks on
// 	 * its icon in the toolbar.
//
// 	 * @return true iff the activation/deactivation should proceed.
// 	 * /
// public abstract onActivate(): boolean;
// public abstract onDeactivate(): boolean;
//
// public onPointerDown(): boolean;
// public onPointerMove(): boolean;
// public onPointerUp(): boolean;
// }
//
// class Pen extends Tool {
// public onActivate();
// public onDeactivate();
// public onActionDown(): boolean;
// public onActionMove(): boolean;
// public onActionUp(): boolean;
// }
//
// class Zoom extends Tool {
// ;
// }
//
