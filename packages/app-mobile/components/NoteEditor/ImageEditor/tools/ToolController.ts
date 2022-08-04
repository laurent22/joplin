import Command from "../commands/Command";
import { InputEvtType, InputEvt, } from "../types";
import ImageEditor from "../editor";
import BaseTool from "./BaseTool";
import PanZoom, { PanZoomMode } from "./PanZoom";
import Pen from "./Pen";
import ToolEnabledGroup from "./ToolEnabledGroup";
import Eraser from "./Eraser";
import SelectionTool from "./SelectionTool";



export enum ToolType {
	TouchPanZoom,
	Pen,
	Selection,
	Eraser,
	PanZoom,
}

/**
 * Controller for interactive tools/modes. See `commands/` for non-interactive
 * tools.
 */
export default class ToolController {
	private tools: BaseTool[];
	private activeTool: BaseTool|null;

	public constructor(editor: ImageEditor) {
		const primaryToolEnabledGroup = new ToolEnabledGroup();
		const touchPanZoom = new PanZoom(editor, PanZoomMode.OneFingerGestures);
		const penTool = new Pen(editor);
		const primaryTools = [
			new SelectionTool(editor),
			new Eraser(editor),
			penTool,
		];
		this.tools = [
			touchPanZoom,
			...primaryTools,
			new PanZoom(editor, PanZoomMode.TwoFingerGestures | PanZoomMode.AnyDevice),
		];
		primaryTools.forEach(tool => tool.setToolGroup(primaryToolEnabledGroup));
		touchPanZoom.setEnabled(false);
		penTool.setEnabled(true);

		this.activeTool = null;
	}

	/**
	 * Sends an input event to the active tool, returns whether the event was handled.
	 * @param event Event to dispatch. If a `PointerDownEvt`, the active tool will be changed.
	 *              `WheelEvt`s are dispatched to the first tool which handles them. Other events
	 *              are dispatched to the active tool.
	 * @return true iff the event was handled.
	 */
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
		} else if (event.kind === InputEvtType.WheelEvt) {
			for (const tool of this.tools) {
				if (tool.isEnabled() && tool.onWheel(event)) {
					handled = true;
					break;
				}
			}
		} else if (this.activeTool !== null) {
			switch (event.kind) {
			case InputEvtType.PointerMoveEvt:
				this.activeTool.onPointerMove(event);
				break;
			case InputEvtType.GestureCancelEvt:
				this.activeTool.onGestureCancel();
				this.activeTool = null;
				break;
			default:
				const _allCasesHandledGuard: never = event;
				return _allCasesHandledGuard;
			}
			handled = true;
		} else {
			handled = false;
		}

		return handled;
	}

	// Returns the enabled Pen tool, if such a tool exists.
	public getCurrentPen(): Pen {
		for (const tool of this.tools) {
			if (
				tool.kind === ToolType.Pen && tool instanceof Pen && tool.isEnabled()
			) {
				return tool;
			}
		}
		return null;
	}

	#setToolEnabled(kind: ToolType, enabled: boolean) {
		const matchingTools = this.tools.filter(tool => tool.kind === kind);
		for (const tool of matchingTools) {
			tool.setEnabled(enabled);
			console.log('Set', tool, '', enabled);
		}
	}

	/**
	 * @param kind kind of tool to search for (e.g. ToolType.Pen would set
	 *             whether the pen tool is enabled)
	 * @param enabled Whether all matching tools should be enabled.
	 * @returns A `Command` that, when applied, enables/disables all matching tools.
	 */
	public static setToolEnabled(kind: ToolType, enabled: boolean): Command {
		return new class implements Command {
			private wasEnabled: boolean|null = null;
			apply(editor: ImageEditor): void {
				this.wasEnabled = editor.toolController.isToolEnabled(kind);
				editor.toolController.#setToolEnabled(kind, enabled);
			}
			unapply(editor: ImageEditor): void {
				// Can't unapply if not applied before
				if (this.wasEnabled !== null) {
					editor.toolController.#setToolEnabled(kind, this.wasEnabled);
				}
			}
		};
	}

	/**
	 * @returns true iff any tools of the given kind are enabled.
	 */
	public isToolEnabled(kind: ToolType): boolean {
		const matchingTools = this.tools.filter(tool => tool.kind === kind);
		return matchingTools.some((tool: BaseTool) => tool.isEnabled());
	}
}

