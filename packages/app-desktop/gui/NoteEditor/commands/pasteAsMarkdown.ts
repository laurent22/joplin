import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import HtmlToMd from '@joplin/lib/HtmlToMd';

const { clipboard } = require('electron');

export const declaration: CommandDeclaration = {
	name: 'pasteAsMarkdown',
	label: () => _('Paste as Markdown'),
};

let htmlToMd_: HtmlToMd | null = null;

const htmlToMd = () => {
	if (!htmlToMd_) {
		htmlToMd_ = new HtmlToMd();
	}
	return htmlToMd_;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Props passed from NoteEditor component
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			const html = clipboard.readHTML();
			// If HTML is available, convert it to Markdown; otherwise fall back to plain text
			const textToInsert = html ? htmlToMd().parse(html, { tightLists: true }) : clipboard.readText();
			if (textToInsert) {
				comp.editorRef.current.execCommand({ name: 'insertText', value: textToInsert });
			}
		},
		enabledCondition: 'oneNoteSelected && markdownEditorVisible',
	};
};
