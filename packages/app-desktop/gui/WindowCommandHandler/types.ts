import { MarkupLanguage } from '@joplin/renderer';

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
		onClose?: (answer: unknown, buttonType: unknown)=> void;
	}|null;
}
