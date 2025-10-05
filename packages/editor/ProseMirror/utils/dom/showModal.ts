import { LocalizationResult } from '../../../types';
import createButton from './createButton';

interface Options {
	content: HTMLElement;
	doneLabel: LocalizationResult;
	onDismiss: ()=> void;
}

const showModal = ({ content, doneLabel, onDismiss }: Options) => {
	const dialog = document.createElement('dialog');
	dialog.classList.add('joplin-dialog', '-visible');
	document.body.appendChild(dialog);

	dialog.onclose = () => {
		onDismiss();
		dialog.remove();
	};

	const onClose = () => {
		if (dialog.close) {
			dialog.close();
		} else {
			// Handle the case where the dialog element is not supported by the
			// browser/testing environment.
			dialog.onclose(new Event('close'));
		}
	};

	dialog.appendChild(content);

	const submitButton = createButton(doneLabel, onClose);
	submitButton.classList.add('done');
	dialog.appendChild(submitButton);

	// .showModal is not defined in JSDOM and some older (pre-2022) browsers
	if (dialog.showModal) {
		dialog.showModal();
	} else {
		dialog.classList.add('-fake-modal');
	}

	return {
		dismiss: onClose,
	};
};

export default showModal;
