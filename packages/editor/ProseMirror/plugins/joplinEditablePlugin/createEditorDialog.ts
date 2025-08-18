import { focus } from '@joplin/lib/utils/focusHandler';
import createTextNode from '../../utils/dom/createTextNode';
import createTextArea from '../../utils/dom/createTextArea';

interface SourceBlockData {
	start: string;
	content: string;
	end: string;
}

interface Options {
	editorLabel: string|Promise<string>;
	doneLabel: string|Promise<string>;
	block: SourceBlockData;
	onSave: (newContent: SourceBlockData)=> void;
	onDismiss: ()=> void;
}

const createEditorDialog = ({ editorLabel, doneLabel, block, onSave, onDismiss }: Options) => {
	const dialog = document.createElement('dialog');
	dialog.classList.add('editor-dialog', '-visible');
	document.body.appendChild(dialog);

	dialog.onclose = () => {
		onDismiss();
		dialog.remove();
	};

	const { textArea, label: textAreaLabel } = createTextArea({
		label: editorLabel,
		initialContent: block.content,
		onChange: (newContent) => {
			block = {
				...block,
				content: newContent,
			};
			onSave(block);
		},
		spellCheck: false,
	});


	const submitButton = document.createElement('button');
	submitButton.appendChild(createTextNode(doneLabel));
	submitButton.classList.add('submit');
	submitButton.onclick = () => {
		if (dialog.close) {
			dialog.close();
		} else {
			// .remove the dialog in browsers with limited support for
			// HTMLDialogElement (and in JSDOM).
			dialog.remove();
		}
	};

	dialog.appendChild(textAreaLabel);
	dialog.appendChild(textArea);
	dialog.appendChild(submitButton);


	// .showModal is not defined in JSDOM and some older (pre-2022) browsers
	if (dialog.showModal) {
		dialog.showModal();
	} else {
		dialog.classList.add('-fake-modal');
		focus('createEditorDialog/legacy', textArea);
	}

	return {};
};

export default createEditorDialog;
