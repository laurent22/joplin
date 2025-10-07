import * as React from 'react';
import { useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { NotificationType } from '../PopupNotification/types';
import useToastNotifier from '../../gui/hooks/useToast';

interface Props {
	noteId: string;
	dispatch: Dispatch;
}

export default (props: Props) => {
	const notify = useToastNotifier();

	useEffect(() => {
		if (!props.noteId || props.noteId === '') return;

		props.dispatch({ type: 'NOTE_HTML_TO_MARKDOWN_DONE', value: '' });

		notify(
			_('The note has been converted to Markdown and the original note has been moved to the trash'),
			{
				type: NotificationType.Success,
				delay: 4000,
			},
		);
	}, [props.dispatch, props.noteId, notify]);

	return <div style={{ display: 'none' }}/>;
};
