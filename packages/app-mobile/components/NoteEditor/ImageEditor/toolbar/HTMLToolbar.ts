import SVGEditor from '../SVGEditor';
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
import { ToolbarLocalization } from './types';

const primaryForegroundFill = `
	style='fill: var(--primary-foreground-color);'
`;
const primaryForegroundStrokeFill = `
	style='fill: var(--primary-foreground-color); stroke: var(--primary-foreground-color);'
`;

const toolbarCSSPrefix = 'toolbar-';
abstract class ToolbarWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element;
	private dropdownContainer: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;
	private hasDropdown: boolean;

	public constructor(
		protected editor: SVGEditor,
		protected targetTool: BaseTool,
		protected localizationTable: ToolbarLocalization
	) {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');
		this.hasDropdown = false;

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
		if (this.hasDropdown) {
			if (!this.targetTool.isEnabled()) {
				this.targetTool.setEnabled(true);
			} else {
				this.setDropdownVisible(!this.isDropdownVisible());
			}
		} else {
			this.targetTool.setEnabled(!this.targetTool.isEnabled());
		}
	}

	// Adds this to [parent]. This can only be called once for each ToolbarWidget.
	public addTo(parent: HTMLElement) {
		this.label.innerText = this.getTitle();

		this.icon = null;
		this.updateIcon();

		this.updateSelected(this.targetTool.isEnabled());

		this.button.replaceChildren(this.icon, this.label);
		this.container.appendChild(this.button);

		this.hasDropdown = this.fillDropdown(this.dropdownContainer);
		if (this.hasDropdown) {
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
			<path
				d='M5,10 L50,90 L95,10 Z'
				${primaryForegroundFill}
			/>
		</g>
		`;
		icon.classList.add(`${toolbarCSSPrefix}showHideDropdownIcon`);
		icon.setAttribute('viewBox', '0 0 100 100');
		return icon;
	}
}

class EraserWidget extends ToolbarWidget {
	protected getTitle(): string {
		return this.localizationTable.eraser;
	}
	protected createIcon(): Element {
		const icon = document.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);

		// Draw an eraser-like shape
		icon.innerHTML = `
		<g>
			<rect x=10 y=50 width=80 height=30 rx=10 fill='pink' />
			<rect
				x=10 y=10 width=80 height=50
				${primaryForegroundFill}
			/>
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
	public constructor(
		editor: SVGEditor, private tool: SelectionTool, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);
	}

	protected getTitle(): string {
		return this.localizationTable.select;
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
	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		const resizeButton = document.createElement('button');

		resizeButton.innerText = this.localizationTable.resizeImageToSelection;
		resizeButton.disabled = true;

		resizeButton.onclick = () => {
			const selection = this.tool.getSelection();
			this.editor.dispatch(this.editor.setImportExportRect(selection.region));
		};

		// Enable/disable actions based on whether items are selected
		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = selection.region.area > 0;
				resizeButton.disabled = !hasSelection;
			}
		});

		container.replaceChildren(resizeButton);
		dropdown.appendChild(container);
		return true;
	}
}

class TouchDrawingWidget extends ToolbarWidget {
	protected getTitle(): string {
		return this.localizationTable.touchDrawing;
	}

	protected createIcon(): Element {
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		// Draw a cursor-like shape
		icon.innerHTML = `
		<g>
			<path d='M11,-30 Q0,10 20,20 Q40,20 40,-30 Z' fill='blue' stroke='black'/>
			<path d='
				M0,90 L0,50 Q5,40 10,50
				L10,20 Q20,15 30,20
				L30,50 Q50,40 80,50
				L80,90 L10,90 Z'
				
				${primaryForegroundStrokeFill}
			/>
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

	public constructor(
		editor: SVGEditor, private tool: Pen, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);

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
		return this.localizationTable.pen;
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
				${primaryForegroundStrokeFill}
			/>
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

		thicknessLabel.innerText = this.localizationTable.thicknessLabel;
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
		colorLabel.innerText = this.localizationTable.colorLabel;
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
}

export default class HTMLToolbar {
	private container: HTMLElement;

	private static defaultStrings: ToolbarLocalization = {
		pen: 'Pen',
		eraser: 'Eraser',
		select: 'Select',
		touchDrawing: 'Touch Drawing',
		thicknessLabel: 'Thickness: ',
		colorLabel: 'Color: ',
		resizeImageToSelection: 'Resize image to selection',
		undo: 'Undo',
		redo: 'Redo',
	};

	public constructor(
		private editor: SVGEditor, parent: HTMLElement,
		private localizationTable: ToolbarLocalization = HTMLToolbar.defaultStrings
	) {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}root`);
		this.addElements();
		parent.appendChild(this.container);

		// Initialize color choosers
		colorisInit();
		coloris({
			el: '.coloris_input',
			format: 'hex',
			selectInput: false,
			focusInput: false,
			themeMode: this.editor.lightMode ? 'light' : 'dark',

			swatches: [
				Color4.red.toHexString(),
				Color4.purple.toHexString(),
				Color4.blue.toHexString(),
				Color4.clay.toHexString(),
				Color4.black.toHexString(),
				Color4.white.toHexString(),
			],
		});
	}

	public addActionButton(text: string, command: ()=> void, parent?: Element) {
		const button = document.createElement('button');
		button.innerText = text;
		button.classList.add(`${toolbarCSSPrefix}toolButton`);
		button.onclick = command;
		(parent ?? this.container).appendChild(button);

		return button;
	}

	private addUndoRedoButtons() {
		const undoRedoGroup = document.createElement('div');
		undoRedoGroup.classList.add(`${toolbarCSSPrefix}buttonGroup`);

		const undoButton = this.addActionButton('Undo', () => {
			this.editor.history.undo();
		}, undoRedoGroup);
		const redoButton = this.addActionButton('Redo', () => {
			this.editor.history.redo();
		}, undoRedoGroup);
		this.container.appendChild(undoRedoGroup);

		undoButton.disabled = true;
		redoButton.disabled = true;
		this.editor.notifier.on(EditorEventType.UndoRedoStackUpdated, event => {
			if (event.kind !== EditorEventType.UndoRedoStackUpdated) {
				throw new Error('Wrong event type!');
			}

			undoButton.disabled = event.undoStackSize === 0;
			redoButton.disabled = event.redoStackSize === 0;
		});
	}

	private addElements() {
		const toolController = this.editor.toolController;
		for (const tool of toolController.getMatchingTools(ToolType.Pen)) {
			if (!(tool instanceof Pen)) {
				throw new Error('All `Pen` tools must have kind === ToolType.Pen');
			}

			const widget = new PenWidget(this.editor, tool, this.localizationTable);
			widget.addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Eraser)) {
			if (!(tool instanceof Eraser)) {
				throw new Error('All Erasers must have kind === ToolType.Eraser!');
			}

			(new EraserWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Selection)) {
			if (!(tool instanceof SelectionTool)) {
				throw new Error('All SelectionTools must have kind === ToolType.Selection');
			}

			(new SelectionWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.TouchPanZoom)) {
			(new TouchDrawingWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		this.addUndoRedoButtons();
	}
}
