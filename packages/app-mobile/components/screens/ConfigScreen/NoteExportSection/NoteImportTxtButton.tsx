import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { FunctionComponent } from 'react';
import { join } from 'path';
import { ConfigScreenStyles } from '../configScreenStyles';
import InteropService from '@joplin/lib/services/interop/InteropService';
import pickDocument from '../../../../utils/pickDocument';
import makeImportExportCacheDirectory from './utils/makeImportExportCacheDirectory';
import shim from '@joplin/lib/shim';
import TaskButton, { OnProgressCallback, SetAfterCompleteListenerCallback, TaskStatus } from './TaskButton';
import { Platform } from 'react-native';
import Folder from '@joplin/lib/models/Folder';

const logger = Logger.create('NoteImportTxtButton');

interface Props {
	styles: ConfigScreenStyles;
}

// Exported for search filtering
export const importTxtButtonDefaultTitle = () => _('Import from TXT');
export const importTxtButtonDescription = () => _('Import note from a Text file.');

const getTitle = (taskStatus: TaskStatus) => {
	if (taskStatus === TaskStatus.InProgress) {
		return _('Importing...');
	} else {
		return importTxtButtonDefaultTitle();
	}
};

const runImportTask = async (
	_onProgress: OnProgressCallback,
	setAfterCompleteListener: SetAfterCompleteListenerCallback,
) => {
	logger.info('Importing TXT...');

	const importFiles = await pickDocument({ multiple: false });
	if (importFiles.length === 0) {
		logger.info('Canceled.');
		return { success: false, warnings: [] };
	}

	const sourceFileUri = importFiles[0].uri;
	const sourceFilePath = Platform.select({
		default: sourceFileUri,
		ios: decodeURI(sourceFileUri),
	});

	const importTargetPath = join(await makeImportExportCacheDirectory(), importFiles[0].fileName);
	setAfterCompleteListener(async (_success: boolean) => {
		await shim.fsDriver().remove(importTargetPath);
	});

	await shim.fsDriver().copy(sourceFilePath, importTargetPath);

	const folder = await Folder.getValidActiveFolder();
	if (!folder) {
		throw new Error(_('Cannot find the selected notebook. Please select a different notebook.'));
	}

	try {
		const status = await InteropService.instance().import({
			path: importTargetPath,
			format: 'txt',
			destinationFolderId: folder,
		});

		logger.info('Imported successfully');
		return { success: true, warnings: status.warnings };
	} catch (error) {
		logger.error('Import failed with error', error);
		throw new Error(_('Import failed. Make sure a Text file was selected.\nDetails: %s', error.toString()));
	}
};

const NoteImportTxtButton: FunctionComponent<Props> = props => {
	return (
		<TaskButton
			taskName={importTxtButtonDefaultTitle()}
			description={importTxtButtonDescription()}
			buttonLabel={getTitle}
			finishedLabel={_('Imported successfully!')}
			styles={props.styles}
			onRunTask={runImportTask}
		/>
	);
};

export default NoteImportTxtButton;
