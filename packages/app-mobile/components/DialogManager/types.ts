
interface BaseButtonSpec {
	text: string;
	style?: 'cancel'|'default'|'destructive';

	checked?: boolean|null;
	iconChecked?: string;
}

export interface PromptButtonSpec extends BaseButtonSpec {
	onPress?: ()=> void;
}

export interface PromptOptions {
	cancelable?: boolean;
}

export interface MenuChoice<IdType> extends BaseButtonSpec {
	id: IdType;
}

export interface DialogControl {
	info(message: string): Promise<void>;
	error(message: string): Promise<void>;
	prompt(title: string, message: string, buttons?: PromptButtonSpec[], options?: PromptOptions): void;
	showMenu<IdType>(title: string, choices: MenuChoice<IdType>[]): Promise<IdType>;
}

export enum DialogType {
	Prompt,
	Menu,
}

export interface PromptDialogData {
	type: DialogType;
	key: string;
	title: string;
	message: string;
	buttons: PromptButtonSpec[];
	onDismiss: (()=> void)|null;
}

