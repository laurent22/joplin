import Command from '../commands/Command';
import { InputEvtType, InputEvt } from '../types';
import SVGEditor from '../SVGEditor';
import BaseTool from './BaseTool';
import PanZoom, { PanZoomMode } from './PanZoom';
import Pen from './Pen';
import ToolEnabledGroup from './ToolEnabledGroup';
import Eraser from './Eraser';
import SelectionTool from './SelectionTool';
import Color4 from '../Color4';



export enum ToolType {
	TouchPanZoom,
	Pen,
	Selection,
	Eraser,
	PanZoom,
}

export default class ToolController {
	private tools: BaseTool[];
	private activeTool: BaseTool|null;

	public constructor(editor: SVGEditor) {
		const primaryToolEnabledGroup = new ToolEnabledGroup();
		const touchPanZoom = new PanZoom(editor, PanZoomMode.OneFingerGestures);
		const primaryPenTool = new Pen(editor);
		const primaryTools = [
			new SelectionTool(editor),
			new Eraser(editor),

			// Three pens
			primaryPenTool,
			new Pen(editor, Color4.clay, 8),

			// Highlighter-like pen with width=64
			new Pen(editor, Color4.ofRGBA(1, 1, 0, 0.5), 64),
		];
		this.tools = [
			touchPanZoom,
			...primaryTools,
			new PanZoom(editor, PanZoomMode.TwoFingerGestures | PanZoomMode.AnyDevice),
		];
		primaryTools.forEach(tool => tool.setToolGroup(primaryToolEnabledGroup));
		touchPanZoom.setEnabled(false);
		primaryPenTool.setEnabled(true);

		this.activeTool = null;
	}

	// Returns true if the event was handled
	public dispatchInputEvent(event: InputEvt): boolean {
		let handled;
		if (event.kind === InputEvtType.PointerDownEvt) {
			for (const tool of this.tools) {
				if (tool.isEnabled() && tool.onPointerDown(event)) {
					if (this.activeTool !== tool) {
						this.activeTool?.onGestureCancel();
					}

					this.activeTool = tool;
					handled = true;
					break;
				}
			}
		} else if (event.kind === InputEvtType.PointerUpEvt) {
			this.activeTool?.onPointerUp(event);
			this.activeTool = null;
			handled = true;
		} else if (
			event.kind === InputEvtType.WheelEvt || event.kind === InputEvtType.KeyPressEvent
		) {
			const isKeyPressEvt = event.kind === InputEvtType.KeyPressEvent;
			const isWheelEvt = event.kind === InputEvtType.WheelEvt;
			for (const tool of this.tools) {
				if (!tool.isEnabled()) {
					continue;
				}

				const wheelResult = isWheelEvt && tool.onWheel(event);
				const keyPressResult = isKeyPressEvt && tool.onKeyPress(event);
				handled = keyPressResult || wheelResult;

				if (handled) {
					break;
				}
			}
		} else if (this.activeTool !== null) {
			let allCasesHandledGuard: never;

			switch (event.kind) {
			case InputEvtType.PointerMoveEvt:
				this.activeTool.onPointerMove(event);
				break;
			case InputEvtType.GestureCancelEvt:
				this.activeTool.onGestureCancel();
				this.activeTool = null;
				break;
			default:
				allCasesHandledGuard = event;
				return allCasesHandledGuard;
			}
			handled = true;
		} else {
			handled = false;
		}

		return handled;
	}

	public getMatchingTools(kind: ToolType): BaseTool[] {
		return this.tools.filter(tool => tool.kind === kind);
	}

	// Private helper
	#setToolEnabled(kind: ToolType, enabled: boolean) {
		const matchingTools = this.tools.filter(tool => tool.kind === kind);
		for (const tool of matchingTools) {
			tool.setEnabled(enabled);
			console.log('Set', tool, '', enabled);
		}
	}

	// Returns A `Command` that, when applied, enables/disables all matching tools.
	public static setToolEnabled(kind: ToolType, enabled: boolean): Command {
		return new class implements Command {
			private wasEnabled: boolean|null = null;
			public apply(editor: SVGEditor): void {
				this.wasEnabled = editor.toolController.isToolEnabled(kind);
				editor.toolController.#setToolEnabled(kind, enabled);
			}
			public unapply(editor: SVGEditor): void {
				// Can't unapply if not applied before
				if (this.wasEnabled !== null) {
					editor.toolController.#setToolEnabled(kind, this.wasEnabled);
				}
			}
		};
	}

	// Returns true iff any tools of the given kind are enabled.
	public isToolEnabled(kind: ToolType): boolean {
		const matchingTools = this.tools.filter(tool => tool.kind === kind);
		return matchingTools.some((tool: BaseTool) => tool.isEnabled());
	}
}

