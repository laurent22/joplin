import { EditorApi } from '../joplinEditorApiPlugin';
import { EditorLanguageType } from '../../../types';
import showModal from '../../utils/dom/showModal';

interface SourceBlockData {
	start: string;
	content: string;
	end: string;
}

interface Options {
	editorLabel: string|Promise<string>;
	doneLabel: string|Promise<string>;
	block: SourceBlockData;
	editorApi: EditorApi;
	onSave: (newContent: SourceBlockData)=> void;
	onDismiss: ()=> void;
}

const createEditorDialog = ({ editorApi, doneLabel, block, onSave, onDismiss }: Options) => {
	const content = document.createElement('div');
	content.classList.add('editor-dialog-content');
	document.body.appendChild(content);

	const editor = editorApi.createCodeEditor(
		content,
		EditorLanguageType.Markdown,
		(newContent) => {
			block = {
				...block,
				start: '',
				end: '',
				content: newContent,
			};
			onSave(block);
		},
	);
	editor.updateBody([
		block.start,
		block.content,
		block.end,
	].join(''));

	return showModal({
		content,
		doneLabel,
		onDismiss: () => {
			onDismiss();
			editor.remove();
		},
	});
};

export default createEditorDialog;
