import ImageEditor from "../editor";
import { EditorEventDataType, EditorEventType } from "../types";

/**
 * An HTML implementation of the toolbar. This implementation is primarially intended for
 * debugging purposes — when the editor is running directly in a browser.
 */
export default class HTMLToolbar {
    public constructor(private editor: ImageEditor, private parent: HTMLElement) {
        editor.notifier.addListener(EditorEventType.ToolEnabled, (tool) => this.onToolEnabled(tool));
        editor.notifier.addListener(EditorEventType.ToolDisabled, (tool) => this.onToolDisabled(tool))
    }

    private onToolEnabled(toolEvent: EditorEventDataType): void {
        if (toolEvent.kind !== EditorEventType.ToolEnabled && toolEvent.kind !== EditorEventType.ToolDisabled) {
            return;
        }
    }

    private onToolDisabled(tool: EditorEventDataType): void {
        throw new Error("Method not implemented.");
    }
}