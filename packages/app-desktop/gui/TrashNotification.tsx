import { useContext, useCallback } from 'react';
import { StateLastDeletion } from '@joplin/lib/reducer';
import { _, _n } from '@joplin/lib/locale';
import NotyfContext from './NotyfContext';
import { waitForElement } from '@joplin/lib/dom';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { htmlentities } from '@joplin/utils/html';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { ModelType } from '@joplin/lib/BaseModel';

interface Props {
	lastDeletion: StateLastDeletion;
}

export default (props: Props) => {
	const notyf = useContext(NotyfContext);

	const onCancelClick = useCallback(async (event: any) => {
		notyf.dismissAll();

		const lastDeletion: StateLastDeletion = JSON.parse(event.currentTarget.getAttribute('data-lastDeletion'));

		if (lastDeletion.folderIds.length) {
			await restoreItems(ModelType.Folder, lastDeletion.folderIds);
		}

		if (lastDeletion.noteIds.length) {
			await restoreItems(ModelType.Note, lastDeletion.noteIds);
		}
	}, [notyf]);

	useAsyncEffect(async (event) => {
		if (!props.lastDeletion) return;

		let msg = '';

		if (props.lastDeletion.folderIds.length) {
			msg = _('The notebook and its content was successfully moved to the trash.');
		} else if (props.lastDeletion.noteIds.length) {
			msg = _n('The note was successfully moved to the trash.', 'The notes were successfully moved to the trash.', props.lastDeletion.noteIds.length);
		} else {
			return;
		}

		const linkId = `deletion-notification-cancel-${Math.floor(Math.random() * 1000000)}`;
		const cancelLabel = _('Cancel');

		notyf.success(`${msg} <a href="#" data-lastDeletion="${htmlentities(JSON.stringify(props.lastDeletion))}" id="${linkId}">${cancelLabel}</a>`);

		const element: HTMLAnchorElement = await waitForElement(document, linkId);
		if (event.cancelled) return;
		element.addEventListener('click', onCancelClick);
	}, [props.lastDeletion, notyf]);

	return <div style={{ display: 'none' }}/>;
};
