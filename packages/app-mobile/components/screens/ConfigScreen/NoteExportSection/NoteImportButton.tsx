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

const logger = Logger.create('NoteImportButton');

interface Props {
	styles: ConfigScreenStyles;
}

// Exported for search filtering
export const importButtonDefaultTitle = () => _('Import from JEX');
export const importButtonDescription = () => _('Import notes from a JEX (Joplin Export) file.');

const getTitle = (taskStatus: TaskStatus) => {
	if (taskStatus === TaskStatus.InProgress) {
		return _('Importing...');
	} else {
		return importButtonDefaultTitle();
	}
};

const runImportTask = async (
	_onProgress: OnProgressCallback,
	setAfterCompleteListener: SetAfterCompleteListenerCallback,
) => {
	const importTargetPath = join(await makeImportExportCacheDirectory(), 'to-import.jex');
	logger.info('Importing...');

	setAfterCompleteListener(async (_success: boolean) => {
		await shim.fsDriver().remove(importTargetPath);
	});

	const importFiles = await pickDocument(false);
	if (importFiles.length === 0) {
		logger.info('Canceled.');
		return { success: false, warnings: [] };
	}

	const sourceFileUri = importFiles[0].uri;
	const sourceFilePath = Platform.select({
		android: sourceFileUri,
		ios: decodeURI(sourceFileUri),
	});
	await shim.fsDriver().copy(sourceFilePath, importTargetPath);

	try {
		const status = await InteropService.instance().import({
			path: importTargetPath,
			format: 'jex',
		});

		logger.info('Imported successfully');
		return { success: true, warnings: status.warnings };
	} catch (error) {
		logger.error('Import failed with error', error);
		throw new Error(_('Import failed. Make sure a JEX file was selected.\nDetails: %s', error.toString()));
	}
};

const NoteImportButton: FunctionComponent<Props> = props => {
	return (
		<TaskButton
			taskName={importButtonDefaultTitle()}
			description={importButtonDescription()}
			buttonLabel={getTitle}
			finishedLabel={_('Imported successfully!')}
			styles={props.styles}
			onRunTask={runImportTask}
		/>
	);
};

export default NoteImportButton;
