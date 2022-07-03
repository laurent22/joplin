
import { Vec2 } from './math';
import PanZoomTool from './tools/PanZoom';
import { Command, Pointer, PointerDevice, PointerEventListener } from './types';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';

export enum ToolType {
	Pen,
	PanZoom,
}

export interface Tool extends PointerEventListener {
	type: ToolType;
}

export class ImageEditor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private wetInkCanvas: HTMLCanvasElement;
	private dryInkCanvas: HTMLCanvasElement;
	private wetInkCtx: CanvasRenderingContext2D;
	private dryInkCtx: CanvasRenderingContext2D;

	private history: UndoRedoHistory;

	private tools: Tool[];
	private activeTool: Tool;

	//private toolbar: EditorToolbar;
	public viewport: Viewport;

	public constructor(readonly parent: HTMLElement) {
		this.container = document.createElement('div');
		this.wetInkCanvas = document.createElement('canvas');
		this.dryInkCanvas = document.createElement('canvas');
		this.wetInkCtx = this.wetInkCanvas.getContext('2d');
		this.dryInkCtx = this.dryInkCanvas.getContext('2d');

		this.wetInkCanvas.className = 'wetInk';
		this.dryInkCanvas.className = 'dryInk';

		this.container.replaceChildren(this.wetInkCanvas, this.dryInkCanvas);
		parent.appendChild(this.container);

		this.tools = [
			new PanZoomTool(this),
		];

		this.registerListeners();
	}

	private registerListeners() {
		const pointerTypeToDevice: Record<string, PointerDevice> = {
			'mouse': PointerDevice.Mouse,
			'pen': PointerDevice.Pen,
			'touch': PointerDevice.Touch,
		};

		const pointerFor = (evt: PointerEvent, isDown: boolean = true): Pointer => {
			const screenPos =  Vec2.of(evt.clientX, evt.clientY);
			let device = pointerTypeToDevice[evt.pointerType] ?? PointerDevice.Other;

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
				res.push(pointers[id]);
			}
			return res;
		}

		this.container.addEventListener('pointerdown', evt => {
			const pointer = pointerFor(evt);
			pointers[pointer.id] = pointer;
			this.container.setPointerCapture(pointer.id);

			for (const tool of this.tools) {
				if (tool.onPointerDown(pointer, getPointerList())) {
					this.activeTool = tool;
				}
			}
		});

		this.container.addEventListener('pointermove', evt => {
			const pointer = pointerFor(evt, pointers[evt.pointerId]?.down ?? false);
			pointers[pointer.id] = pointer;

			this.activeTool?.onPointerMove(pointer, getPointerList());
		});

		this.container.addEventListener('pointerup', evt => {
			const pointer = pointerFor(evt, false);
			pointers[pointer.id] = pointer;
			this.container.releasePointerCapture(pointer.id);

			this.activeTool?.onPointerUp(pointer, getPointerList());

			delete pointers[pointer.id];
		});
	}

	public dispatch(command: Command) {
		// .push applies [command] to this
		this.history.push(command);
	}

	public rerender() {
		// TODO
		this.dryInkCtx.fillRect(0, 0, 1, 1);
		this.wetInkCtx.fillRect(1, 1, 20, 2);
	}

	public toSVG(): SVGElement {
		return null;
	}
}

export default ImageEditor;

/*


class EditorToolbar {
	// Class name used for styling the toolbar container with CSS.
	private static containerClass = 'EditorToolbar';

	private buttons: Record<ToolID, HTMLButtonElement>;
	public constructor(readonly parent: HTMLElement,
					   readonly translationTable: Record<string, string>) {
		this.container = document.createElement('div');
		this.container.classList.add(EditorToolbar.containerClass);
		parent.appendChild(this.container);
	}

	public registerTool(tool: Tool) {
		// getButtonData() → ButtonDescription
	}
}

enum ToolID {
	Pen,
	Eraser,
	Zoom,
}

interface ButtonDescription {
	icon: string|Image|HTMLElement;
	longDescription: string;
	shortDescription: string;
}

abstract class Tool {
	public constructor(public readonly id: ToolID) {
	}

	/**
	 * Register [listener], which is called whenever the tool can/can no longer
	 * be enabled.
	 * /
	public setOnDisabledChangedListener(listener: (disabled: boolean)=>void) { }

	/**
	 * @return how this tool's toolbar button should look/behave.
	 * /
	public abstract getButtonData(): ButtonDescription;

	/**
	 * Called when the user activates this tool (e.g. clicks on
	 * its icon in the toolbar.
	 *
	 * @return true iff the activation/deactivation should proceed.
	 * /
	public abstract onActivate(): boolean;
	public abstract onDeactivate(): boolean;

	public onPointerDown(): boolean;
	public onPointerMove(): boolean;
	public onPointerUp(): boolean;
}

class Pen extends Tool {
	public onActivate();
	public onDeactivate();
	public onActionDown(): boolean;
	public onActionMove(): boolean;
	public onActionUp(): boolean;
}

class Zoom extends Tool {
	;
}
*/