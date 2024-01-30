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

const logger = Logger.create('NoteImportButton');

interface Props {
	styles: ConfigScreenStyles;
}

export const importButtonDefaultTitle = () => _('Import from JEX');
export const importButtonDescription = () => _('Loads a notebook from a JEX file.');

const getTitle = (taskStatus: TaskStatus) => {
	if (taskStatus === TaskStatus.NotStarted) {
		return importButtonDefaultTitle();
	} else if (taskStatus === TaskStatus.InProgress) {
		return _('Importing...');
	} else {
		return _('Imported successfully!');
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
		return { success: false, warnings: [] };
	}

	const sourceFilePath = importFiles[0].uri;
	await shim.fsDriver().copy(sourceFilePath, importTargetPath);


	const status = await InteropService.instance().import({
		path: importTargetPath,
		format: 'jex',
	});

	logger.info('Imported successfully');

	return { success: true, warnings: status.warnings };
};

const NoteImportButton: FunctionComponent<Props> = props => {
	return (
		<TaskButton
			taskName={importButtonDefaultTitle()}
			title={getTitle}
			styles={props.styles}
			onRunTask={runImportTask}
		/>
	);
};

export default NoteImportButton;
