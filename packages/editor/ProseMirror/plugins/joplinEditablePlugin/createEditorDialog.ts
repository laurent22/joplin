import { focus } from '@joplin/lib/utils/focusHandler';
import createTextNode from '../../utils/dom/createTextNode';
import { EditorApi } from '../joplinEditorApiPlugin';
import { EditorLanguageType } from '../../../types';

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
	const dialog = document.createElement('dialog');
	dialog.classList.add('editor-dialog', '-visible');
	document.body.appendChild(dialog);

	dialog.onclose = () => {
		onDismiss();
		dialog.remove();
		editor.remove();
	};

	const editor = editorApi.createCodeEditor(
		dialog,
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

	const onClose = () => {
		if (dialog.close) {
			dialog.close();
		} else {
			// Handle the case where the dialog element is not supported by the
			// browser/testing environment.
			dialog.onclose(new Event('close'));
		}
	};

	const submitButton = document.createElement('button');
	submitButton.appendChild(createTextNode(doneLabel));
	submitButton.classList.add('submit');
	submitButton.onclick = onClose;

	dialog.appendChild(submitButton);


	// .showModal is not defined in JSDOM and some older (pre-2022) browsers
	if (dialog.showModal) {
		dialog.showModal();
	} else {
		dialog.classList.add('-fake-modal');
		focus('createEditorDialog/legacy', editor);
	}

	return {
		dismiss: onClose,
	};
};

export default createEditorDialog;
