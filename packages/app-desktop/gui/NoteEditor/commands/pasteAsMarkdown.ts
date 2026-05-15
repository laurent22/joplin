import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import HtmlToMd from '@joplin/lib/HtmlToMd';
import { processImagesInPastedHtml } from '../utils/resourceHandling';
import { WindowCommandDependencies } from '../utils/types';

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

export const runtime = (comp: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async () => {
			let html = clipboard.readHTML();
			if (html) {
				// Download images and convert them to Joplin resources
				html = await processImagesInPastedHtml(html, { useInternalUrls: true });
				const markdown = htmlToMd().parse(html, { tightLists: true, collapseMultipleBlankLines: true });
				void comp.editorRef.current.execCommand({ name: 'insertText', value: markdown });
			} else {
				// Fall back to plain text if no HTML is available
				const text = clipboard.readText();
				if (text) {
					void comp.editorRef.current.execCommand({ name: 'insertText', value: text });
				}
			}
		},
		enabledCondition: 'oneNoteSelected && markdownEditorVisible',
	};
};
