import { EditorApi } from '../../joplinEditorApiPlugin';
import { EditorLanguageType } from '../../../../types';
import showModal from '../../../utils/dom/showModal';

interface Options {
	source: string;
	editorApi: EditorApi;
	onSave: (newContent: string)=> void;
	onDismiss: ()=> void;
}

const createEditorDialog = ({ editorApi, source, onSave, onDismiss }: Options) => {
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

	const _ = editorApi.localize;
	return showModal({
		content,
		doneLabel: _('Done'),
		onDismiss: () => {
			onDismiss();
			editor.remove();
		},
	});
};

export default createEditorDialog;
