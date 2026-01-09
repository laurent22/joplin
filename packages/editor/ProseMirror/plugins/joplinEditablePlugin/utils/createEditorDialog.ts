import { EditorApi } from '../../joplinEditorApiPlugin';
import { EditorLanguageType } from '../../../../types';
import showModal from '../../../utils/dom/showModal';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Options {
	source: string;
	cursor: number;
	editorApi: EditorApi;
	onSave: (newContent: string)=> void;
	onDismiss: ()=> void;
}

const createEditorDialog = ({ editorApi, source, cursor, onSave, onDismiss }: Options) => {
	const content = document.createElement('div');
	content.classList.add('editor-dialog-content');
	document.body.appendChild(content);

	const editor = editorApi.createCodeEditor(
		content,
		EditorLanguageType.Markdown,
		(newContent) => {
			onSave(newContent);
		},
	);
	editor.updateBody(source);
	editor.select(cursor, cursor);

	const _ = editorApi.localize;
	const modal = showModal({
		content,
		doneLabel: _('Done'),
		onDismiss: () => {
			onDismiss();
			editor.remove();
		},
	});

	focus('createEditorDialog', editor);

	return modal;
};

export default createEditorDialog;
