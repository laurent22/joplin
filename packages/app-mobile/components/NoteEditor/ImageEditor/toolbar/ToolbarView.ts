import ImageEditor from '../editor';
import Command from '../commands/Command';
import { ToolbarButton, ToolbarButtonId, ToolbarButtonSpec, ToolbarButtonType, ToolbarViewSpec } from './types';

/**
 * An HTML implementation of the toolbar's main display.
 * 
 * TODO: Remove this file — it has been replaced by HTMLToolbar
 */
export default class ToolbarView {
	private container: HTMLElement;
	private buttons: Record<ToolbarButtonId, ToolbarButton>;

	public constructor(parent: HTMLElement, private editor: ImageEditor) {
		this.container = document.createElement('div');
		parent.appendChild(this.container);
		this.buttons = {};
	}

	/** Creates or updates the given button with the provided data */
	private updateButton(id: ToolbarButtonId, newSpec: ToolbarButtonSpec) {
		const currentSpec = this.buttons[id]?.spec;

		const titleOf = (spec: ToolbarButtonSpec): string => {
			if (spec.kind === ToolbarButtonType.ActionButton) {
				return spec.title;
			} else {
				return spec.active ? spec.activeTitle : spec.deactivatedTitle;
			}
		};

		const actionFor = (spec: ToolbarButtonSpec): (()=>Command) => {
			if (spec.kind === ToolbarButtonType.ActionButton) {
				return spec.action;
			} else {
				return spec.active ? spec.actionDisable : spec.actionEnable;
			}
		};

		const onClickFor = (spec: ToolbarButtonSpec): (()=>void) => {
			return () => {
				const action = actionFor(spec);
				if (spec.canUndo) {
					this.editor.dispatch(action());
				} else {
					action().apply(this.editor);
				}
			}
		};

		if (!this.buttons[id]) {
			const element = document.createElement('button');

			// Add a dummy icon that can be replaced later
			const icon = document.createElement('img');
			element.appendChild(icon);

			this.container.appendChild(element);
			this.buttons[id] = {
				spec: null,
				element,
				icon,
			};
		}

		const buttonElem = this.buttons[id].element;
		const buttonImage = this.buttons[id].icon;
		if (!currentSpec || titleOf(currentSpec) !== titleOf(newSpec)) {
			buttonElem.title = titleOf(newSpec);
		}
		if (currentSpec?.disabled !== newSpec.disabled) {
			buttonElem.disabled = newSpec.disabled;
		}
		if (currentSpec?.icon !== newSpec.icon) {
			const newIcon = newSpec.icon.cloneNode(true) as HTMLOrSVGImageElement;
			buttonImage.replaceWith(newIcon);
			this.buttons[id].icon = newIcon;
		}
		if (currentSpec?.position !== newSpec.position) {
			buttonElem.style.order = newSpec.position.toString();
		}
		if (!currentSpec || actionFor(currentSpec) !== actionFor(newSpec)) {
			buttonElem.onclick = onClickFor(newSpec);
		}

		this.buttons[id].spec = newSpec;
	}

	/** Create or update all buttons based on the given spec. */
	public rebuild(spec: ToolbarViewSpec) {
		// All entries not in toPreserve have been deleted
		const toPreserve: Record<ToolbarButtonId, boolean> = {};
		for (const id in spec.components) {
			if (spec.components[id] == this.buttons[id]?.spec) {
				continue;
			}
			this.updateButton(id, spec.components[id]);
		}

		for (const id in this.buttons) {
			if (!toPreserve[id]) {
				this.buttons[id].element.remove();
				delete this.buttons[id];
			}
		}
	}
}
