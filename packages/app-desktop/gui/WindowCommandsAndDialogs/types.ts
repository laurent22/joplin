import { MarkupLanguage } from '@joplin/renderer';

export interface RecurrenceConfig {
	label: string;
	options: { value: string; label: string }[];
	value: string;
}

export interface DialogState {
	noteContentPropertiesDialogOptions: {
		visible: boolean;
		noteId?: string;
		text?: string;
		markupLanguage?: MarkupLanguage;
	};
	shareNoteDialogOptions: {
		visible: boolean;
		noteIds?: string[];
	};
	notePropertiesDialogOptions: {
		visible: boolean;
		noteId?: string;
		onRevisionLinkClick?: ()=> void;
	};
	shareFolderDialogOptions: {
		visible: boolean;
		folderId?: string;
	};
	promptOptions: {
		inputType?: string;
		buttons?: unknown[];
		description?: string;
		label?: string;
		value?: string;
		autocomplete?: unknown;
		recurrence?: RecurrenceConfig;
		onClose?: (answer: unknown, buttonType: unknown, recurrenceValue?: string)=> void;
	}|null;
}
