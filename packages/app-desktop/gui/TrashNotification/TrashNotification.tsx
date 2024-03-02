import { useContext, useCallback, useMemo } from 'react';
import { StateLastDeletion } from '@joplin/lib/reducer';
import { _, _n } from '@joplin/lib/locale';
import NotyfContext from '../NotyfContext';
import { waitForElement } from '@joplin/lib/dom';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { htmlentities } from '@joplin/utils/html';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { ModelType } from '@joplin/lib/BaseModel';
import { themeStyle } from '@joplin/lib/theme';
import { Dispatch } from 'redux';

interface Props {
	lastDeletion: StateLastDeletion;
	lastDeletionNotificationTime: number;
	themeId: number;
	dispatch: Dispatch;
}

export default (props: Props) => {
	const notyfContext = useContext(NotyfContext);

	const theme = useMemo(() => {
		return themeStyle(props.themeId);
	}, [props.themeId]);

	const notyf = useMemo(() => {
		const output = notyfContext;
		output.options.types = notyfContext.options.types.map(type => {
			if (type.type === 'success') {
				type.background = theme.backgroundColor5;
				(type.icon as any).color = theme.backgroundColor5;
			}
			return type;
		});
		return output;
	}, [notyfContext, theme]);

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
		if (!props.lastDeletion || props.lastDeletion.timestamp <= props.lastDeletionNotificationTime) return;

		props.dispatch({ type: 'DELETION_NOTIFICATION_DONE' });

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

		notyf.success(`${msg} <a href="#" class="cancel" data-lastDeletion="${htmlentities(JSON.stringify(props.lastDeletion))}" id="${linkId}">${cancelLabel}</a>`);

		const element: HTMLAnchorElement = await waitForElement(document, linkId);
		if (event.cancelled) return;
		element.addEventListener('click', onCancelClick);
	}, [props.lastDeletion, notyf, props.dispatch]);

	return <div style={{ display: 'none' }}/>;
};
