import ImageEditor from "../editor";
import ToolController, { ToolType } from "../tools/ToolController";
import { EditorEventDataType, EditorEventType } from "../types";

interface HTMLToolButton {
	onToolEnabled(): void;
	onToolDisabled(): void;
}

/**
 * An HTML implementation of the toolbar. This implementation is primarially intended for
 * debugging purposes — when the editor is running directly in a browser.
 */
export default class HTMLToolbar {
	private toolButtons: Record<ToolType, HTMLToolButton[]>;
	private container: HTMLElement;

    public constructor(private editor: ImageEditor, parent: HTMLElement) {
        editor.notifier.on(EditorEventType.ToolEnabled, (tool) => this.onToolEnabled(tool));
        editor.notifier.on(EditorEventType.ToolDisabled, (tool) => this.onToolDisabled(tool));

		this.container = document.createElement('div');
		this.container.classList.add('toolbar');
		this.addElements();
		parent.appendChild(this.container);
    }

    private onToolEnabled(toolEvent: EditorEventDataType): void {
        if (toolEvent.kind !== EditorEventType.ToolEnabled) {
			throw new Error(`Wrong event type ${toolEvent.kind}`);
        }

		this.toolButtons[toolEvent.toolType]?.forEach(
			tool => tool.onToolEnabled()
		);
    }

    private onToolDisabled(toolEvent: EditorEventDataType): void {
        if (toolEvent.kind !== EditorEventType.ToolDisabled) {
			throw new Error(`Wrong event type ${toolEvent.kind}`);
        }

		this.toolButtons[toolEvent.toolType]?.forEach(
			tool => tool.onToolDisabled()
		);
    }

	private addToolButton(toolType: ToolType, toolName: string) {
		const button = document.createElement('button');
		button.innerText = `Toggle ${toolName}`;
		button.classList.add('toolButton');
		button.onclick = () => {
			const toolController = this.editor.toolController;
			const isEnabled = toolController.isToolEnabled(toolType);
			const cmd = ToolController.setToolEnabled(toolType, !isEnabled);
			cmd.apply(this.editor);
		};

		const onToolEnabled = () => {
			button.classList.remove('toolDisabled');
		};

		const onToolDisabled = () => {
			button.classList.add('toolDisabled');
		};

		if (this.editor.toolController.isToolEnabled(toolType)) {
			onToolEnabled();
		} else {
			onToolDisabled();
		}

		this.toolButtons[toolType] ??= [];
		this.toolButtons[toolType].push({
			onToolEnabled,
			onToolDisabled,
		});
		this.container.appendChild(button);
	}

	private addElements() {
		this.addToolButton(ToolType.TouchPanZoom, 'Touch Panning');
		this.addToolButton(ToolType.Eraser, 'Eraser');
		this.addToolButton(ToolType.Selection, 'Select Tool');
	}
}
