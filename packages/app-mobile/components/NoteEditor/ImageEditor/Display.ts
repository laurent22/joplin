import AbstractRenderer from "./rendering/AbstractRenderer";
import CanvasRenderer from "./rendering/CanvasRenderer";
import { ImageEditor } from "./editor";
import { EditorEventType } from "./types";
import DummyRenderer from "./rendering/DummyRenderer";

export enum RenderingMode {
	DummyRenderer,
	CanvasRenderer,
}

export default class Display {
	private dryInkRenderer: AbstractRenderer;
	private wetInkRenderer: AbstractRenderer;
	private resizeSurfacesCallback?: ()=>void;

	public constructor(
		private editor: ImageEditor, mode: RenderingMode, private parent: HTMLElement|null
	) {
		if (mode === RenderingMode.CanvasRenderer) {
			this.initializeCanvasRendering();
		} else {
			this.dryInkRenderer = new DummyRenderer(editor.viewport);
			this.wetInkRenderer = new DummyRenderer(editor.viewport);
		}
		// TODO: SVG case


		this.editor.notifier.on(EditorEventType.DisplayResized, event => {
			if (event.kind !== EditorEventType.DisplayResized) {
				throw new Error('Mismatched event.kinds!');
			}

			this.resizeSurfacesCallback?.();
		});
	}

	// Returns the visible width of the display (e.g. how much
	// space the display's element takes up in the x direction
	// in the DOM).
	public get width(): number {
		return this.dryInkRenderer.displaySize().x;
	}

	public get height(): number {
		return this.dryInkRenderer.displaySize().y;
	}

	private initializeCanvasRendering() {
		const dryInkCanvas = document.createElement('canvas');
		const wetInkCanvas = document.createElement('canvas');
		const dryInkCtx = dryInkCanvas.getContext('2d');
		const wetInkCtx = wetInkCanvas.getContext('2d');

		this.dryInkRenderer = new CanvasRenderer(dryInkCtx, this.editor.viewport);
		this.wetInkRenderer = new CanvasRenderer(wetInkCtx, this.editor.viewport);

		dryInkCanvas.className = 'dryInkCanvas';
		wetInkCanvas.className = 'wetInkCanvas';

		if (this.parent) {
			this.parent.appendChild(dryInkCanvas);
			this.parent.appendChild(wetInkCanvas);
		}

		this.resizeSurfacesCallback = () => {
			const hasSizeMismatch = (canvas: HTMLCanvasElement): boolean => {
				return canvas.clientHeight !== canvas.height || canvas.clientWidth !== canvas.width;
			};

			// Ensure that the drawing surfaces sizes match the
			// canvas' sizes to prevent stretching.
			if (hasSizeMismatch(dryInkCanvas) || hasSizeMismatch(wetInkCanvas)) {
				dryInkCanvas.width = dryInkCanvas.clientWidth;
				dryInkCanvas.height = dryInkCanvas.clientHeight;
				wetInkCanvas.width = wetInkCanvas.clientWidth;
				wetInkCanvas.height = wetInkCanvas.clientHeight;
			}
		};
		this.resizeSurfacesCallback();
	}

	// Clears the drawing surfaces and otherwise prepares for a rerender.
	public startRerender(): AbstractRenderer {
		this.resizeSurfacesCallback?.();
		this.wetInkRenderer.clear();
		this.dryInkRenderer.clear();

		return this.dryInkRenderer;
	}

	public getDryInkRenderer(): AbstractRenderer {
		return this.dryInkRenderer;
	}

	public getWetInkRenderer(): AbstractRenderer {
		return this.wetInkRenderer;
	}
}