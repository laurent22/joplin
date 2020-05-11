import { FormNote } from './types';

const HtmlToMd = require('lib/HtmlToMd');
const Note = require('lib/models/Note');
const { MarkupToHtml } = require('lib/joplin-renderer');

export async function htmlToMarkdown(markupLanguage: number, html: string, originalCss:string): Promise<string> {
	let newBody = '';

	if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
		const htmlToMd = new HtmlToMd();
		newBody = htmlToMd.parse(html, { preserveImageTagsWithSize: true });
		newBody = await Note.replaceResourceExternalToInternalLinks(newBody, { useAbsolutePaths: true });
	} else {
		newBody = await Note.replaceResourceExternalToInternalLinks(html, { useAbsolutePaths: true });
		if (originalCss) newBody = `<style>${originalCss}</style>\n${newBody}`;
	}

	return newBody;
}

export async function formNoteToNote(formNote: FormNote): Promise<any> {
	return {
		id: formNote.id,
		title: formNote.title,
		body: formNote.body,
	};
}
