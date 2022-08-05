import ImageEditor from "../editor";
import ToolController, { ToolType } from "../tools/ToolController";
import { EditorEventType } from "../types";

import './toolbar.css';
import "@melloware/coloris/dist/coloris.css";
import { coloris, init as colorisInit } from "@melloware/coloris";
import Color4 from "../Color4";
import Pen from "../tools/Pen";

interface HTMLToolButton {
	onToolEnabled(): void;
	onToolDisabled(): void;
}

// WidgetBuilder
//  → build()
//  → withIcon(...)
//  → withTitle(...)

const toolbarCSSPrefix = 'toolbar-';
abstract class ToolbarWidget {
	private readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element;
	private dropdownContainer: HTMLElement;
	private label: HTMLLabelElement;

	public constructor() {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');

		this.button.onclick = () => {
			this.handleClick();
		};
	}

	protected abstract getTitle(): string;
	protected abstract createIcon(): Element;

	// Add content to the widget's associated dropdown menu.
	// Returns true if such a menu should be created, false otherwise.
	protected abstract fillDropdown(dropdown: HTMLElement): boolean;

	// Returns true if this' dropdown should be visible.
	protected abstract handleClick(): void;

	// Adds this to [parent]. This can only be called once for each ToolbarWidget.
	public addTo(parent: HTMLElement) {
		this.label.innerText = this.getTitle();

		this.icon = this.createIcon();
		this.icon.classList.add(`${toolbarCSSPrefix}icon`);
		this.button.replaceChildren(this.icon, this.label);
		this.container.appendChild(this.button);

		if (this.fillDropdown(this.dropdownContainer)) {
			this.container.appendChild(this.dropdownContainer);
		}

		parent.appendChild(this.container);
	}

	protected updateIcon() {
		const newIcon = this.createIcon();
		this.icon?.replaceWith(newIcon);
		this.icon = newIcon;
	}

	protected updateSelected(active: boolean) {
		if (active) {
			this.container.classList.add('selected');
		} else {
			this.container.classList.remove('selected');
		}
	}

	protected setDropdownVisible(visible: boolean) {
		if (visible) {
			this.dropdownContainer.classList.remove('hidden');
		} else {
			this.dropdownContainer.classList.add('hidden');
		}
	}

	protected isDropdownVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}
}

class PenWidget extends ToolbarWidget {
	private updateInputs: ()=>void = () => {};

	public constructor(private editor: ImageEditor, private targetTool: Pen) {
		super();
		this.editor.notifier.on(EditorEventType.ToolEnabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolEnabled) {
				throw new Error('Incorrect event type! (Expected ToolEnabled)');
			}

			if (toolEvt.tool === this.targetTool) {
				this.updateSelected(true);
			}
		});

		this.editor.notifier.on(EditorEventType.ToolDisabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolDisabled) {
				throw new Error('Incorrect event type! (Expected ToolDisabled)');
			}

			if (toolEvt.tool === this.targetTool) {
				this.updateSelected(false);
			}
		});

		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			// The button icon may depend on tool properties.
			if (toolEvt.tool === this.targetTool) {
				this.updateIcon();
				this.updateInputs();
			}
		})

		this.updateSelected(this.targetTool.isEnabled());
	}

	protected getTitle(): string {
		return 'Pen'; // TODO: Localize
	}

	protected createIcon(): Element {
		// We need to use createElementNS to embed an SVG element in HTML.
		// See http://zhangwenli.com/blog/2017/07/26/createelementns/
		const icon = document.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);
		const scale = this.targetTool.getThickness() / 2;
		const color = this.targetTool.getColor();

		// Draw a pen-like shape
		icon.innerHTML = `
		<g>
			<path
				d='M10,10 L90,10 L90,60 L${50 + scale},80 L${50 - scale},80 L10,60 Z'
				fill='black' stroke='black'/>
			<path
				d='M14,63 L${50 - scale},85 L${50 + scale},83 L86,60 Z'
				fill='${color.toHexString()}'/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');

		return icon;
	}

	private static idCounter: number = 0;
	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		const thicknessRow = document.createElement('div');
		const thicknessLabel = document.createElement('label');
		const thicknessInput = document.createElement('input');

		thicknessInput.id = `${toolbarCSSPrefix}thicknessInput${PenWidget.idCounter++}`;

		thicknessLabel.innerText = 'Thickness: '; // TODO: Localize
		thicknessLabel.setAttribute('for', thicknessInput.id);

		thicknessInput.type = 'range';
		thicknessInput.min = '1';
		thicknessInput.max = '61';
		thicknessInput.step = '5';
		thicknessInput.oninput = () => {
			this.targetTool.setThickness(parseFloat(thicknessInput.value));
		};
		thicknessRow.appendChild(thicknessLabel);
		thicknessRow.appendChild(thicknessInput);
		
		const colorRow = document.createElement('div');
		const colorLabel = document.createElement('label');
		const colorInput = document.createElement('input');

		colorInput.id = `${toolbarCSSPrefix}colorInput${PenWidget.idCounter++}`;
		colorLabel.innerText = 'Color: ';
		colorLabel.setAttribute('for', colorInput.id);

		colorInput.className = 'coloris_input';
		colorInput.type = 'text';
		colorInput.oninput = () => {
			this.targetTool.setColor(Color4.fromHex(colorInput.value));
		};

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInput);

		this.updateInputs = () => {
			colorInput.value = this.targetTool.getColor().toHexString();
			thicknessInput.value = this.targetTool.getThickness().toString();
		};
		this.updateInputs();

		container.replaceChildren(colorRow, thicknessRow);
		dropdown.replaceChildren(container);
		return true;
	}

	protected handleClick(): void {
		if (!this.targetTool.isEnabled()) {
			this.targetTool.setEnabled(true);
		} else {
			this.setDropdownVisible(!this.isDropdownVisible());
		}
	}
}

/**
 * An HTML implementation of the toolbar. This implementation is primarially intended for
 * debugging purposes — when the editor is running directly in a browser.
 */
export default class HTMLToolbar {
	private toolButtons: Partial<Record<ToolType, HTMLToolButton[]>>;
	private container: HTMLElement;

    public constructor(private editor: ImageEditor, parent: HTMLElement) {
		this.toolButtons = {};

		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}root`);
		this.addElements();
		parent.appendChild(this.container);

		// Initialize color choosers
		colorisInit();
		coloris({
			el: '.coloris_input',
			format: 'hex',
			theme: 'polaroid',
			focusInput: false,
			swatches: [
				Color4.red.toHexString(),
				Color4.purple.toHexString(),
				Color4.blue.toHexString(),
				Color4.yellow.toHexString(),
				Color4.green.toHexString(),
				Color4.clay.toHexString(),
				Color4.black.toHexString(),
				Color4.white.toHexString(),
			],
		});
    }

	private addToolButton(toolType: ToolType, toolName: string) {
		const button = document.createElement('button');
		button.innerText = `${toolName}`;
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

	private addActionButton(text: string, command: ()=>void) {
		const button = document.createElement('button');
		button.innerText = text;
		button.classList.add('toolButton');
		button.onclick = command;
		this.container.appendChild(button);
	}

	private addElements() {
		const toolController = this.editor.toolController;
		for (const tool of toolController.getMatchingTools(ToolType.Pen)) {
			if (!(tool instanceof Pen)) {
				throw new Error('All `Pen` tools must have kind === ToolType.Pen');
			}

			const widget = new PenWidget(this.editor, tool);
			widget.addTo(this.container);
		}

		this.addToolButton(ToolType.TouchPanZoom, 'Touch Panning');
		this.addToolButton(ToolType.Eraser, 'Eraser');
		this.addToolButton(ToolType.Selection, 'Select Tool');
		this.addActionButton('Undo', () => {
			this.editor.history.undo();
		});
		this.addActionButton('Redo', () => {
			this.editor.history.redo();
		});
	}
}
