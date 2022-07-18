import Command from "../commands/Command";

export enum ToolbarButtonType {
	ToggleButton,
	ActionButton,
};

export interface ToolbarToggleButtonSpec {
	readonly kind: ToolbarButtonType.ToggleButton;
	readonly disabled: boolean;
	readonly active: boolean;
	readonly position: number;

	readonly activeTitle: string;
	readonly deactivatedTitle: string;
	readonly icon: HTMLImageElement;

	readonly actionEnable: ()=> Command;
	readonly actionDisable: ()=> Command;
	readonly canUndo: boolean;
}

export interface ToolbarActionButtonSpec {
	readonly kind: ToolbarButtonType.ActionButton;
	readonly disabled: boolean;

	// Position in the toolbar
	readonly position: number;

	readonly title: string;
	readonly icon: HTMLOrSVGImageElement;
	readonly action: ()=> Command;
	readonly canUndo: boolean;
}

export type ToolbarButtonSpec = ToolbarToggleButtonSpec | ToolbarActionButtonSpec;

export type ToolbarButtonId = string;
export interface ToolbarViewSpec {
	/** Each ToolbarButton should have a unique ID */
	components: Record<ToolbarButtonId, ToolbarButtonSpec>;
}

export interface ToolbarButton {
	spec: ToolbarButtonSpec;
	element: HTMLButtonElement;
	icon: HTMLOrSVGImageElement;
}
