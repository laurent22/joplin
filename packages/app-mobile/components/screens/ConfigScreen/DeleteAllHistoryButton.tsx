import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { FunctionComponent } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import shim from '@joplin/lib/shim';
import TaskButton, { OnProgressCallback, TaskStatus } from './NoteExportSection/TaskButton';
import Revision from '@joplin/lib/models/Revision';

const logger = Logger.create('DeleteAllHistoryButton');

interface Props {
	styles: ConfigScreenStyles;
}

// Exported for search filtering
export const deleteAllHistoryButtonDefaultTitle = () => _('Delete all history');
export const deleteAllHistoryButtonDescription = () => _('Delete history for all notes.');

const getTitle = (taskStatus: TaskStatus) => {
	if (taskStatus === TaskStatus.InProgress) {
		return _('Deleting note history...');
	} else {
		return deleteAllHistoryButtonDefaultTitle();
	}
};

const runTask = async (
	_onProgress: OnProgressCallback,
) => {
	const response = await shim.showMessageBox(_('Are you sure you want to delete all note history? This cannot be undone.'), {
		title: _('Warning'),
		buttons: [_('Yes'), _('No')],
	});
	if (response === 0) {
		try {
			await Revision.deleteOldRevisions(0);
			logger.info('Note history deletion completed');
			return { success: true, warnings: [] as string[] };
		} catch (error) {
			logger.error('Note history deletion failed with error', error);
			throw new Error(_('Note history deletion failed.\nDetails: %s', error.toString()));
		}
	} else {
		logger.info('Canceled.');
		return { success: false, warnings: [] };
	}
};

const DeleteAllHistoryButton: FunctionComponent<Props> = props => {
	return (
		<TaskButton
			taskName={deleteAllHistoryButtonDefaultTitle()}
			description={deleteAllHistoryButtonDescription()}
			buttonLabel={getTitle}
			finishedLabel={_('Note history deletion completed!')}
			styles={props.styles}
			onRunTask={runTask}
		/>
	);
};

export default DeleteAllHistoryButton;
