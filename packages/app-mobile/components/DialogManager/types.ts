
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
	onDismiss?(): void;
	cancelable?: boolean;
}

export interface MenuChoice<IdType> extends BaseButtonSpec {
	id: IdType;
}

export interface DialogControl {
	info(message: string): Promise<void>;
	error(message: string): Promise<void>;
	prompt(title: string, message: string, buttons?: PromptButtonSpec[], options?: PromptOptions): void;
	promptForText(message: string, initialValue?: string): Promise<string>;
	showMenu<IdType>(title: string, choices: MenuChoice<IdType>[]): Promise<IdType>;
}

export enum DialogType {
	ButtonPrompt,
	Menu,
	TextInput,
}

export interface ButtonDialogData {
	type: DialogType.ButtonPrompt|DialogType.Menu;
	key: string;
	title: string;
	message: string;
	buttons: PromptButtonSpec[];
	onDismiss: (()=> void)|null;
}

export interface TextInputDialogData {
	type: DialogType.TextInput;
	key: string;
	message: string;
	initialValue?: string;
	onSubmit: (text: string)=> void;
	onDismiss: ()=> void;
}

export type DialogData = ButtonDialogData | TextInputDialogData;

