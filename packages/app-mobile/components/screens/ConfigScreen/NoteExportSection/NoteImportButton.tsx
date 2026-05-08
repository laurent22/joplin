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
import { FolderEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';

const logger = Logger.create('NoteImportButton');

interface Props {
	styles: ConfigScreenStyles;
	defaultTitle: string;
	description: string;
	format: string;
	activeFolder?: FolderEntity;
}

export const importedFolderTitle = () => {
	return _('Imported Notes');
};

const importedFolder = async () => {
	let folder = await Folder.loadByFields({
		title: importedFolderTitle(),
		deleted_time: 0,
	});
	if (!folder) {
		folder = await Folder.save({ title: importedFolderTitle() });
	}
	return folder;
};

const NoteImportButton: FunctionComponent<Props> = props => {
	const getTitle = (taskStatus: TaskStatus) => {
		if (taskStatus === TaskStatus.InProgress) {
			return _('Importing...');
		} else {
			return props.defaultTitle;
		}
	};

	const runImportTask = async (
		_onProgress: OnProgressCallback,
		setAfterCompleteListener: SetAfterCompleteListenerCallback,
	) => {
		logger.info(`Importing ${props.format}...`);

		const importFiles = await pickDocument({ multiple: false });
		if (importFiles.length === 0) {
			logger.info('Canceled.');
			return { success: false, warnings: [] };
		}

		const sourceFileUri = importFiles[0].uri;
		const sourceFilePath = Platform.select({
			default: sourceFileUri,
			ios: decodeURIComponent(sourceFileUri),
		});

		const importTargetPath = join(await makeImportExportCacheDirectory(), importFiles[0].fileName);
		setAfterCompleteListener(async (_success: boolean) => {
			await shim.fsDriver().remove(importTargetPath);
		});

		await shim.fsDriver().copy(sourceFilePath, importTargetPath);

		let activeFolderId = props.activeFolder ? props.activeFolder.id : null;
		if (props.format === 'txt' && !activeFolderId) {
			activeFolderId = (await importedFolder()).id;
		}

		try {
			const status = await InteropService.instance().import({
				path: importTargetPath,
				format: props.format,
				destinationFolderId: activeFolderId,
			});

			logger.info('Imported successfully');
			return { success: true, warnings: status.warnings };
		} catch (error) {
			logger.error('Import failed with error', error);
			throw new Error(_('Import failed. Make sure a %s file was selected.\nDetails: %s', props.format, error.toString()));
		}
	};

	return (
		<TaskButton
			taskName={props.defaultTitle}
			description={props.description}
			buttonLabel={getTitle}
			finishedLabel={_('Imported successfully!')}
			styles={props.styles}
			onRunTask={runImportTask}
		/>
	);
};

export default NoteImportButton;
