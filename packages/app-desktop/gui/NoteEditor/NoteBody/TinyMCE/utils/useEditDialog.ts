import { RefObject, useMemo } from 'react';
import type { Editor } from 'tinymce';
import { DispatchDidUpdateCallback, TinyMceEditorEvents } from './types';
import { MarkupToHtmlHandler } from '../../../utils/types';
import { _ } from '@joplin/lib/locale';
import enableTextAreaTab, { TextAreaTabHandler } from './enableTextAreaTab';
import { MarkupToHtml } from '@joplin/renderer';

interface Props {
	editor: Editor;
	markupToHtml: RefObject<MarkupToHtmlHandler>;
	dispatchDidUpdate: DispatchDidUpdateCallback;
}

export interface EditDialogControl {
	editNew: ()=> void;
	editExisting: (elementInEditable: Node)=> void;
	isEditable: (element: Node)=> boolean;
}

interface SourceInfo {
	openCharacters: string;
	closeCharacters: string;
	content: string;
	node: Element;
	language: string;
}

function findBlockSource(node: Element): SourceInfo {
	const sources = node.getElementsByClassName('joplin-source');
	if (!sources.length) throw new Error('No source for node');
	const source = sources[0];

	return {
		openCharacters: source.getAttribute('data-joplin-source-open'),
		closeCharacters: source.getAttribute('data-joplin-source-close'),
		content: source.textContent,
		node: source,
		language: source.getAttribute('data-joplin-language') || '',
	};
}

function newBlockSource(language = '', content = '', previousSource: SourceInfo = null): SourceInfo {
	let fence = '```';

	if (language === 'katex') {
		if (previousSource && previousSource.openCharacters === '$') {
			fence = '$';
		} else {
			fence = '$$';
		}
	}

	const fenceLanguage = language === 'katex' ? '' : language;

	return {
		openCharacters: fence === '$' ? '$' : `\n${fence}${fenceLanguage}\n`,
		closeCharacters: fence === '$' ? '$' : `\n${fence}\n`,
		content: content,
		node: null,
		language: language,
	};
}

function editableInnerHtml(html: string): string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const editable = temp.getElementsByClassName('joplin-editable');
	if (!editable.length) throw new Error(`Invalid joplin-editable: ${html}`);
	return editable[0].innerHTML;
}

function openEditDialog(
	editor: Editor,
	markupToHtml: RefObject<MarkupToHtmlHandler>,
	dispatchDidUpdate: DispatchDidUpdateCallback,
	editable: Element,
) {
	const source = editable ? findBlockSource(editable) : newBlockSource();
	let tabHandler: TextAreaTabHandler|null = null;

	editor.windowManager.open({
		title: _('Edit'),
		size: 'large',
		initialData: {
			codeTextArea: source.content,
			languageInput: source.language,
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		onSubmit: async (dialogApi: any) => {
			const newSource = newBlockSource(dialogApi.getData().languageInput, dialogApi.getData().codeTextArea, source);
			const md = `${newSource.openCharacters}${newSource.content}${newSource.closeCharacters}`;
			const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });

			// markupToHtml will return the complete editable HTML, but we only
			// want to update the inner HTML, so as not to break additional props that
			// are added by TinyMCE on the main node.

			if (editable) {
				editable.innerHTML = editableInnerHtml(result.html);
			} else {
				editor.insertContent(result.html);
			}

			dialogApi.close();
			editor.fire(TinyMceEditorEvents.JoplinChange);
			dispatchDidUpdate(editor);
		},
		onClose: () => {
			tabHandler?.remove();
		},
		body: {
			type: 'panel',
			items: [
				{
					type: 'input',
					name: 'languageInput',
					label: 'Language',
					// Katex is a special case with special opening/closing tags
					// and we don't currently handle switching the language in this case.
					enabled: source.language !== 'katex',
				},
				{
					type: 'textarea',
					name: 'codeTextArea',
				},
			],
		},
		buttons: [
			{
				type: 'submit',
				text: 'OK',
			},
		],
	});

	window.requestAnimationFrame(() => {
		const containerDocument = editor.getContainer().ownerDocument;
		const textAreas = containerDocument.querySelectorAll<HTMLTextAreaElement>('.tox-textarea');
		tabHandler = enableTextAreaTab([...textAreas]);
	});
}

const findEditableContainer = (node: Node) => {
	if (node.nodeName.startsWith('#')) { // Not an element, e.g. #text
		node = node.parentElement;
	}
	return (node as Element)?.closest('.joplin-editable');
};

const useEditDialog = ({
	editor, markupToHtml, dispatchDidUpdate,
}: Props): EditDialogControl => {
	return useMemo(() => {
		const edit = (editable: Element|null) => {
			openEditDialog(editor, markupToHtml, dispatchDidUpdate, editable);
		};

		return {
			isEditable: element => !!findEditableContainer(element),
			editExisting: (element: Node) => {
				const editable = findEditableContainer(element);
				if (editable) {
					edit(editable);
				}
			},
			editNew: () => {
				edit(null);
			},
		};
	}, [editor, markupToHtml, dispatchDidUpdate]);
};

export default useEditDialog;
