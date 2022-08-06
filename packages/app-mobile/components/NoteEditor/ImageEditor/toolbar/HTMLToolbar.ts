import ImageEditor from '../editor';
import { ToolType } from '../tools/ToolController';
import { EditorEventType } from '../types';

import './toolbar.css';
import '@melloware/coloris/dist/coloris.css';
import { coloris, init as colorisInit } from '@melloware/coloris';
import Color4 from '../Color4';
import Pen from '../tools/Pen';
import Eraser from '../tools/Eraser';
import BaseTool from '../tools/BaseTool';
import SelectionTool from '../tools/SelectionTool';

// WidgetBuilder
//  → build()
//  → withIcon(...)
//  → withTitle(...)

const toolbarCSSPrefix = 'toolbar-';
abstract class ToolbarWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element;
	private dropdownContainer: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;

	public constructor(editor: ImageEditor, protected targetTool: BaseTool) {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');
		this.button.tabIndex = 0;

		this.button.onclick = () => {
			this.handleClick();
		};


		editor.notifier.on(EditorEventType.ToolEnabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolEnabled) {
				throw new Error('Incorrect event type! (Expected ToolEnabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(true);
			}
		});

		editor.notifier.on(EditorEventType.ToolDisabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolDisabled) {
				throw new Error('Incorrect event type! (Expected ToolDisabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(false);
				this.setDropdownVisible(false);
			}
		});
	}

	protected abstract getTitle(): string;
	protected abstract createIcon(): Element;

	// Add content to the widget's associated dropdown menu.
	// Returns true if such a menu should be created, false otherwise.
	protected abstract fillDropdown(dropdown: HTMLElement): boolean;

	protected handleClick() {
		this.targetTool.setEnabled(!this.targetTool.isEnabled());
	}

	// Adds this to [parent]. This can only be called once for each ToolbarWidget.
	public addTo(parent: HTMLElement) {
		this.label.innerText = this.getTitle();

		this.icon = null;
		this.updateIcon();

		this.updateSelected(this.targetTool.isEnabled());

		this.button.replaceChildren(this.icon, this.label);
		this.container.appendChild(this.button);

		if (this.fillDropdown(this.dropdownContainer)) {
			this.dropdownIcon = this.createDropdownIcon();
			this.button.appendChild(this.dropdownIcon);
			this.container.appendChild(this.dropdownContainer);
		}

		this.setDropdownVisible(false);
		parent.appendChild(this.container);
	}

	protected updateIcon() {
		const newIcon = this.createIcon();
		this.icon?.replaceWith(newIcon);
		this.icon = newIcon;
		this.icon.classList.add(`${toolbarCSSPrefix}icon`);
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
			this.container.classList.add('dropdownVisible');
		} else {
			this.dropdownContainer.classList.add('hidden');
			this.container.classList.remove('dropdownVisible');
		}
	}

	protected isDropdownVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}

	private createDropdownIcon(): Element {
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		icon.innerHTML = `
		<g>
			<path d='M5,10 L50,90 L95,10 Z'/>
		</g>
		`;
		icon.classList.add(`${toolbarCSSPrefix}showHideDropdownIcon`);
		icon.setAttribute('viewBox', '0 0 100 100');
		return icon;
	}
}

class EraserWidget extends ToolbarWidget {
	protected getTitle(): string {
		return 'Eraser'; // TODO: Localize
	}
	protected createIcon(): Element {
		const icon = document.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);

		// Draw an eraser-like shape
		icon.innerHTML = `
		<g>
			<rect x=10 y=50 width=80 height=30 rx=10 fill='pink' />
			<rect x=10 y=10 width=80 height=50 fill='black'/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');

		return icon;
	}

	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown associated with the eraser
		return false;
	}
}

class SelectionWidget extends ToolbarWidget {
	protected getTitle(): string {
		return 'Select'; // TODO: Localize
	}

	protected createIcon(): Element {
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		// Draw a cursor-like shape
		icon.innerHTML = `
		<g>
			<rect x=10 y=10 width=70 height=70 fill='pink' stroke='black'/>
			<rect x=75 y=75 width=10 height=10 fill='white' stroke='black'/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');

		return icon;
	}
	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown
		return false;
	}
}

class TouchDrawingWidget extends ToolbarWidget {
	protected getTitle(): string {
		return 'Touch Drawing'; // TODO: Localize
	}

	protected createIcon(): Element {
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		// Draw a cursor-like shape
		icon.innerHTML = `
		<g>
			<path d='M11,-30 Q0,10 20,20 Q40,20 40,-30 Z' fill='blue'/>
			<path d='
				M0,90 L0,50 Q5,40 10,50
				L10,20 Q20,15 30,20
				L30,50 Q50,40 80,50
				L80,90 L10,90 Z' fill='black' stroke='black' />
		</g>
		`;
		icon.setAttribute('viewBox', '-10 -30 100 100');

		return icon;
	}
	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown
		return false;
	}
	protected updateSelected(active: boolean) {
		if (active) {
			this.container.classList.remove('selected');
		} else {
			this.container.classList.add('selected');
		}
	}
}

class PenWidget extends ToolbarWidget {
	private updateInputs: ()=> void = () => {};

	public constructor(private editor: ImageEditor, private tool: Pen) {
		super(editor, tool);

		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			// The button icon may depend on tool properties.
			if (toolEvt.tool === this.tool) {
				this.updateIcon();
				this.updateInputs();
			}
		});
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

		// Use a square-root scale to prevent the pen's tip from overflowing.
		const scale = Math.round(Math.sqrt(this.tool.getThickness()) * 2);
		const color = this.tool.getColor();

		// Draw a pen-like shape
		const primaryStrokeTipPath = `M14,63 L${50 - scale},95 L${50 + scale},90 L88,60 Z`;
		const backgroundStrokeTipPath = `M14,63 L${50 - scale},85 L${50 + scale},83 L88,60 Z`;
		icon.innerHTML = `
		<defs>
			<pattern
				id='checkerboard'
				viewBox='0,0,10,10'
				width='20%'
				height='20%'
				patternUnits='userSpaceOnUse'
			>
				<rect x=0 y=0 width=10 height=10 fill='white'/>
				<rect x=0 y=0 width=5 height=5 fill='gray'/>
				<rect x=5 y=5 width=5 height=5 fill='gray'/>
			</pattern>
		</defs>
		<g>
			<!-- Pen grip -->
			<path
				d='M10,10 L90,10 L90,60 L${50 + scale},80 L${50 - scale},80 L10,60 Z'
				fill='black' stroke='black'/>
		</g>
		<g>
			<!-- Checkerboard background for slightly transparent pens -->
			<path d='${backgroundStrokeTipPath}' fill='url(#checkerboard)'/>

			<!-- Actual pen tip -->
			<path
				d='${primaryStrokeTipPath}'
				fill='${color.toHexString()}'
				stroke='${color.toHexString()}'
			/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');

		return icon;
	}

	private static idCounter: number = 0;
	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		// Thickness: Value of the input is squared to allow for finer control/larger values.
		const thicknessRow = document.createElement('div');
		const thicknessLabel = document.createElement('label');
		const thicknessInput = document.createElement('input');

		thicknessInput.id = `${toolbarCSSPrefix}thicknessInput${PenWidget.idCounter++}`;

		thicknessLabel.innerText = 'Thickness: '; // TODO: Localize
		thicknessLabel.setAttribute('for', thicknessInput.id);

		thicknessInput.type = 'range';
		thicknessInput.min = '1';
		thicknessInput.max = '20';
		thicknessInput.step = '1';
		thicknessInput.oninput = () => {
			this.tool.setThickness(parseFloat(thicknessInput.value) ** 2);
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
		colorInput.type = 'button';
		colorInput.oninput = () => {
			this.tool.setColor(Color4.fromHex(colorInput.value));
		};

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInput);

		this.updateInputs = () => {
			colorInput.value = this.tool.getColor().toHexString();
			thicknessInput.value = Math.sqrt(this.tool.getThickness()).toString();
		};
		this.updateInputs();

		container.replaceChildren(colorRow, thicknessRow);
		dropdown.replaceChildren(container);
		return true;
	}

	protected handleClick(): void {
		if (!this.tool.isEnabled()) {
			this.tool.setEnabled(true);
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
	private container: HTMLElement;

	public constructor(private editor: ImageEditor, parent: HTMLElement) {
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
			selectInput: false,
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

	private addActionButton(text: string, command: ()=> void) {
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

		for (const tool of toolController.getMatchingTools(ToolType.Eraser)) {
			if (!(tool instanceof Eraser)) {
				throw new Error('All Erasers must have kind === ToolType.Eraser!');
			}

			(new EraserWidget(this.editor, tool)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Selection)) {
			if (!(tool instanceof SelectionTool)) {
				throw new Error('All SelectionTools must have kind === ToolType.Selection');
			}

			(new SelectionWidget(this.editor, tool)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.TouchPanZoom)) {
			(new TouchDrawingWidget(this.editor, tool)).addTo(this.container);
		}

		this.addActionButton('Undo', () => {
			this.editor.history.undo();
		});
		this.addActionButton('Redo', () => {
			this.editor.history.redo();
		});
		this.addActionButton('Save', () => {
			// TODO: Connect to Joplin here
			const popup = window.open();
			const img = this.editor.toSVG();

			popup.document.open();
			popup.document.write(`
				<!DOCTYPE html>
				<html>
				<body>
					<style>
						svg {
							width: 500px;
							border: 1px solid gray;
						}
					</style>
					<p>Save/load isn't fully implemented. For now, save the following text as an SVG:</p>
					<textarea id='svg-text'>${img.outerHTML}</textarea><br/>
					${img.outerHTML}
				</body>
				</html>`
			);
			popup.document.close();

			throw new Error('TO-DO: Save/communicate with Joplin');
		});
	}
}
