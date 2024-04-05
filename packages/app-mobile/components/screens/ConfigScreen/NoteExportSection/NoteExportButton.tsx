import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { FunctionComponent } from 'react';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import Share from 'react-native-share';
import exportAllFolders from './utils/exportAllFolders';
import { ExportProgressState } from '@joplin/lib/services/interop/types';
import { ConfigScreenStyles } from '../configScreenStyles';
import makeImportExportCacheDirectory from './utils/makeImportExportCacheDirectory';
import TaskButton, { OnProgressCallback, SetAfterCompleteListenerCallback, TaskStatus } from './TaskButton';

const logger = Logger.create('NoteExportButton');

interface Props {
	styles: ConfigScreenStyles;
}

export const exportButtonDefaultTitle = () => _('Export all notes as JEX');
export const exportButtonDescription = () => _('Share a copy of all notes in a file format that can be imported by Joplin on a computer.');

const getTitle = (taskStatus: TaskStatus) => {
	if (taskStatus === TaskStatus.InProgress) {
		return _('Exporting...');
	} else {
		return exportButtonDefaultTitle();
	}
};

const runExportTask = async (
	onProgress: OnProgressCallback,
	setAfterCompleteListener: SetAfterCompleteListenerCallback,
) => {
	const exportTargetPath = join(await makeImportExportCacheDirectory(), 'jex-export.jex');
	logger.info(`Exporting all folders to path ${exportTargetPath}`);

	setAfterCompleteListener(async (success: boolean) => {
		if (success) {
			await Share.open({
				type: 'application/jex',
				filename: 'export.jex',
				url: `file://${exportTargetPath}`,
				failOnCancel: false,
			});
		}
		await shim.fsDriver().remove(exportTargetPath);
	});

	// Initially, undetermined progress
	onProgress(undefined);

	const status = await exportAllFolders(exportTargetPath, (status, progress) => {
		if (progress !== null) {
			onProgress(progress);
		} else if (status === ExportProgressState.Closing || status === ExportProgressState.QueuingItems) {
			// We don't have a numeric progress value and the closing/queuing state may take a while.
			// Set a special progress value:
			onProgress(undefined);
		}
	});

	onProgress(1);

	logger.info('Export complete');

	return { warnings: status.warnings, success: true };
};

const NoteExportButton: FunctionComponent<Props> = props => {
	return (
		<TaskButton
			taskName={exportButtonDefaultTitle()}
			buttonLabel={getTitle}
			finishedLabel={_('Exported successfully!')}
			description={exportButtonDescription()}
			styles={props.styles}
			onRunTask={runExportTask}
		/>
	);
};

export default NoteExportButton;
