import Command from "../commands/Command";
import { InputEvtType, InputEvt, } from "../types";
import ImageEditor from "../editor";
import BaseTool from "./BaseTool";
import PanZoom from "./PanZoom";
import Pen from "./Pen";



export enum ToolType {
	Pen,
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
		this.tools = [
			new Pen(editor),
			new PanZoom(editor),
		];
		this.activeTool = null;
	}

	/**
	 * Sends an input event to the active tool, returns whether the event was handled.
	 * @param event Event to dispatch. If a `PointerDownEvt`, the active tool will be changed.
	 *              `WheelEvt`s are dispatched to the first tool which handles them. Other events
	 *              are dispatched to the active tool.
	 * @return true iff the event was handled.
	 */
	dispatchEvent(event: InputEvt): boolean {
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
		} else if (this.activeTool != null) {
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

	#setToolEnabled(kind: ToolType, enabled: boolean) {
		const matchingTools = this.tools.filter(tool => tool.kind === kind);
		for (const tool of matchingTools) {
			tool.setEnabled(enabled);
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

