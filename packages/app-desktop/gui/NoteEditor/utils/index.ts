import { FormNote } from './types';

import HtmlToMd from '@joplin/lib/HtmlToMd';
import Note from '@joplin/lib/models/Note';
const { MarkupToHtml } = require('@joplin/renderer');

export async function htmlToMarkdown(markupLanguage: number, html: string, originalCss: string): Promise<string> {
	let newBody = '';

	if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
		const htmlToMd = new HtmlToMd();
		newBody = htmlToMd.parse(html, {
			preserveImageTagsWithSize: true,
			preserveNestedTables: true,
			preserveColorStyles: true,
		});
		newBody = await Note.replaceResourceExternalToInternalLinks(newBody, { useAbsolutePaths: true });
	} else {
		newBody = await Note.replaceResourceExternalToInternalLinks(html, { useAbsolutePaths: true });
		if (originalCss) newBody = `<style>${originalCss}</style>\n${newBody}`;
	}

	return newBody;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function formNoteToNote(formNote: FormNote): Promise<any> {
	return {
		id: formNote.id,
		// Should also include parent_id and deleted_time so that the reducer
		// can know in which folder the note should go when saving.
		// https://discourse.joplinapp.org/t/experimental-wysiwyg-editor-in-joplin/6915/57?u=laurent
		parent_id: formNote.parent_id,
		deleted_time: formNote.deleted_time,
		title: formNote.title,
		body: formNote.body,
	};
}
