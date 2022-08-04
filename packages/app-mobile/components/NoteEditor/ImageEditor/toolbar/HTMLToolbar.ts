import ImageEditor from "../editor";
import ToolController, { ToolType } from "../tools/ToolController";
import { EditorEventDataType, EditorEventType } from "../types";

import './toolbar.css';
import "@melloware/coloris/dist/coloris.css";
import { coloris, init as colorisInit } from "@melloware/coloris";
import Color4 from "../Color4";

interface HTMLToolButton {
	onToolEnabled(): void;
	onToolDisabled(): void;
}

// WidgetBuilder
//  → build()
//  → withIcon(...)
//  → withTitle(...)

const toolbarClassPrefix = 'toolbar-';

/**
 * An HTML implementation of the toolbar. This implementation is primarially intended for
 * debugging purposes — when the editor is running directly in a browser.
 */
export default class HTMLToolbar {
	private toolButtons: Partial<Record<ToolType, HTMLToolButton[]>>;
	private container: HTMLElement;

    public constructor(private editor: ImageEditor, parent: HTMLElement) {
		this.toolButtons = {};

        editor.notifier.on(EditorEventType.ToolEnabled, (tool) => this.onToolEnabled(tool));
        editor.notifier.on(EditorEventType.ToolDisabled, (tool) => this.onToolDisabled(tool));

		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarClassPrefix}root`);
		this.addElements();
		parent.appendChild(this.container);

		// Initialize color choosers
		colorisInit();
		coloris({
			el: '.coloris_input',
			format: 'hex',
			theme: 'polaroid',
			swatches: [
				Color4.red.toHexString(),
				Color4.purple.toHexString(),
				Color4.yellow.toHexString(),
				Color4.black.toHexString(),
				Color4.white.toHexString(),
			],
		});
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
			console.log('Set tool', toolName, '.isEnabled to', !isEnabled);
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

	private addActionButton(text: string, command: ()=>void) {
		const button = document.createElement('button');
		button.innerText = text;
		button.classList.add('toolButton');
		button.onclick = command;
		this.container.appendChild(button);
	}

	private addElements() {
		this.addToolButton(ToolType.TouchPanZoom, 'Touch Panning');
		this.addToolButton(ToolType.Eraser, 'Eraser');
		this.addToolButton(ToolType.Selection, 'Select Tool');
		this.addToolButton(ToolType.Pen, 'Pen');
		this.addActionButton('Undo', () => {
			this.editor.history.undo();
		});
		this.addActionButton('Redo', () => {
			this.editor.history.redo();
		});

		const thicknessInput = document.createElement('input');
		thicknessInput.type = 'range';
		thicknessInput.min = '1';
		thicknessInput.max = '61';
		thicknessInput.step = '5';
		thicknessInput.oninput = () => {
			const penTool = this.editor.toolController.getCurrentPen();
			if (penTool) {
				penTool.setThickness(parseFloat(thicknessInput.value));
			}
		};
		thicknessInput.ariaLabel = 'Thickness';
		
		const colorInput = document.createElement('input');
		colorInput.className = 'coloris_input';
		colorInput.type = 'text';
		colorInput.value = Color4.black.toHexString();
		colorInput.oninput = () => {
			const penTool = this.editor.toolController.getCurrentPen();
			if (penTool) {
				penTool.setColor(Color4.fromHex(colorInput.value));
			}
		};
		this.container.appendChild(colorInput);
		this.container.appendChild(thicknessInput);
		// TODO: @melloware/coloris colorpicker
		// https://yarnpkg.com/package/@melloware/coloris
	}
}
