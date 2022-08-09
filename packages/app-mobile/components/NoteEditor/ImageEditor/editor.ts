
import EditorImage from './EditorImage';
import ToolController from './tools/ToolController';
import { InputEvtType, PointerEvt, EditorNotifier, EditorEventType, ImageLoader } from './types';
import Command from './commands/Command';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from '@joplin/lib/EventDispatcher';
import { Point2, Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import HTMLToolbar from './toolbar/HTMLToolbar';
import { RenderablePathSpec } from './rendering/AbstractRenderer';
import Display, { RenderingMode } from './Display';
import SVGRenderer from './rendering/SVGRenderer';
import Color4 from './Color4';
import SVGLoader from './SVGLoader';
import './editor.css';
import Pointer from './Pointer';
import Mat33 from './geometry/Mat33';

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

	private loadingWarning: HTMLElement;

	public constructor(
		parent: HTMLElement, renderingMode: RenderingMode = RenderingMode.CanvasRenderer
	) {
		this.container = document.createElement('div');
		this.renderingRegion = document.createElement('div');
		this.container.appendChild(this.renderingRegion);
		this.container.className = 'imageEditorContainer';

		this.loadingWarning = document.createElement('div');
		this.loadingWarning.classList.add('loadingMessage');
		this.container.appendChild(this.loadingWarning);

		this.renderingRegion.style.touchAction = 'none';
		this.renderingRegion.className = 'imageEditorRenderArea';
		this.renderingRegion.setAttribute('tabIndex', '0');
		this.renderingRegion.ariaLabel = 'Image editor'; // TODO: Localize/make more descriptive

		this.notifier = new EventDispatcher();
		this.importExportViewport = new Viewport(this.notifier);
		this.viewport = new Viewport(this.notifier);
		this.display = new Display(this, renderingMode, this.renderingRegion);
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this);
		this.toolController = new ToolController(this);

		parent.appendChild(this.container);

		// Default to a 1000x1500 image
		this.importExportViewport.updateScreenSize(Vec2.of(1000, 1500));

		this.viewport.updateScreenSize(
			Vec2.of(this.display.width, this.display.height)
		);

		this.registerListeners();
		this.rerender();
		this.hideLoadingWarning();
	}

	public showLoadingWarning(fractionLoaded: number) {
		const loadingPercent = Math.round(fractionLoaded * 100);
		this.loadingWarning.innerText = `Loading... ${loadingPercent}%`; // TODO: Localize!
		this.loadingWarning.style.display = 'block';
	}

	public hideLoadingWarning() {
		this.loadingWarning.style.display = 'none';
	}

	public addToolbar(): HTMLToolbar {
		return new HTMLToolbar(this, this.container);
	}

	private registerListeners() {
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
			const pointer = Pointer.ofEvent(evt, true, this.viewport);
			pointers[pointer.id] = pointer;

			this.renderingRegion.setPointerCapture(pointer.id);
			const event: PointerEvt = {
				kind: InputEvtType.PointerDownEvt,
				current: pointer,
				allPointers: getPointerList(),
			};
			this.toolController.dispatchInputEvent(event);

			return true;
		});

		this.renderingRegion.addEventListener('pointermove', evt => {
			const pointer = Pointer.ofEvent(
				evt, pointers[evt.pointerId]?.down ?? false, this.viewport
			);
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
			const pointer = Pointer.ofEvent(evt, false, this.viewport);
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

		this.renderingRegion.addEventListener('keydown', evt => {
			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.KeyPressEvent,
				key: evt.key,
			})) {
				evt.preventDefault();
			}
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
				return true;
			}
			return false;
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

	// Apply a large transformation in chunks.
	// If [apply] is false, the commands are unapplied.
	// Triggers a re-render after each [updateChunkSize]-sized group of commands
	// has been applied.
	private async asyncApplyOrUnapplyCommands(
		commands: Command[], apply: boolean, updateChunkSize: number
	) {
		for (let i = 0; i < commands.length; i += updateChunkSize) {
			this.showLoadingWarning(i / commands.length);

			for (let j = i; j < commands.length && j < i + updateChunkSize; j++) {
				const cmd = commands[j];

				if (apply) {
					cmd.apply(this);
				} else {
					cmd.unapply(this);
				}
			}

			// Re-render to show progress, but only if we're not done.
			if (i + updateChunkSize < commands.length) {
				await new Promise(resolve => {
					this.rerender();
					requestAnimationFrame(resolve);
				});
			}
		}
		this.hideLoadingWarning();
	}

	public asyncApplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, true, chunkSize);
	}

	public asyncUnapplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, false, chunkSize);
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

	public rerender(showImageBounds: boolean = true) {
		this.display.startRerender();

		// Draw a rectangle around the region that will be visible on save
		const renderer = this.display.getDryInkRenderer();

		if (showImageBounds) {
			const exportRectFill = { fill: Color4.fromHex('#44444455') };
			const exportRectStrokeWidth = 12;
			renderer.drawRect(
				this.importExportViewport.visibleRect,
				exportRectStrokeWidth,
				exportRectFill
			);
		}

		this.image.render(renderer, this.viewport);
		this.rerenderQueued = false;
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

	// Dispatch a pen event to the currently selected tool.
	// Intented for unit tests.
	public sendPenEvent(
		eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
		point: Point2,
		allPointers?: Pointer[]
	) {
		const mainPointer = Pointer.ofCanvasPoint(
			point, eventType !== InputEvtType.PointerUpEvt, this.viewport
		);
		this.toolController.dispatchInputEvent({
			kind: eventType,
			allPointers: allPointers ?? [
				mainPointer,
			],
			current: mainPointer,
		});
	}

	public toSVG(): SVGElement {
		const viewport = this.importExportViewport;
		const svgNameSpace = 'http://www.w3.org/2000/svg';
		const result = document.createElementNS(svgNameSpace, 'svg');
		const renderer = new SVGRenderer(result, viewport);

		// Render **all** elements.
		this.image.renderAll(renderer);

		// Just show the main region
		const rect = viewport.visibleRect;
		result.setAttribute('viewBox', `${rect.x} ${rect.y} ${rect.w} ${rect.h}`);
		result.setAttribute('width', `${rect.w}`);
		result.setAttribute('height', `${rect.w}`);

		// Ensure the image can be identified as an SVG if downloaded.
		// See https://jwatt.org/svg/authoring/
		result.setAttribute('version', '1.1');
		result.setAttribute('baseProfile', 'full');
		result.setAttribute('xmlns', svgNameSpace);


		return result;
	}

	public async loadFrom(loader: ImageLoader) {
		this.showLoadingWarning(0);
		const visibleRect = await loader.start((component) => {
			(new EditorImage.AddElementCommand(component)).apply(this);
		}, (countProcessed: number, totalToProcess: number) => {
			if (countProcessed % 100 === 0) {
				this.showLoadingWarning(countProcessed / totalToProcess);
				this.rerender(false);
				return new Promise(resolve => {
					requestAnimationFrame(() => resolve());
				});
			}

			return null;
		});
		this.hideLoadingWarning();

		this.importExportViewport.updateScreenSize(visibleRect.size);
		this.importExportViewport.resetTransform(Mat33.translation(visibleRect.topLeft));
	}

	// Alias for loadFrom(SVGLoader.fromString).
	// This is particularly useful when accessing a bundled version of the editor.
	public async loadFromSVG(svgData: string) {
		const loader = SVGLoader.fromString(svgData);
		await this.loadFrom(loader);
	}
}

export default ImageEditor;
