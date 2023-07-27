import * as React from 'react';
import { Text, Alert, View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { ProgressBar } from 'react-native-paper';
import { FunctionComponent, useCallback, useState } from 'react';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import Share from 'react-native-share';
import exportAllFolders, { makeExportCacheDirectory } from './exportAllFolders';
import { ExportProgressState } from '@joplin/lib/services/interop/types';
import { ConfigScreenStyles } from '../configScreenStyles';
import ConfigScreenButton from '../ConfigScreenButton';

const logger = Logger.create('NoteExportButton');

interface Props {
	styles: ConfigScreenStyles;
}

enum ExportStatus {
	NotStarted,
	Exporting,
	Exported,
}

const NoteExportButton: FunctionComponent<Props> = props => {
	const [exportStatus, setExportStatus] = useState<ExportStatus>(ExportStatus.NotStarted);
	const [exportProgress, setExportProgress] = useState<number|undefined>(0);
	const [warnings, setWarnings] = useState<string>('');

	const startExport = useCallback(async () => {
		// Don't run multiple exports at the same time.
		if (exportStatus === ExportStatus.Exporting) {
			return;
		}

		setExportStatus(ExportStatus.Exporting);
		const exportTargetPath = join(await makeExportCacheDirectory(), 'jex-export.jex');
		logger.info(`Exporting all folders to path ${exportTargetPath}`);

		try {
			// Initially, undetermined progress
			setExportProgress(undefined);

			const status = await exportAllFolders(exportTargetPath, (status, progress) => {
				if (progress !== null) {
					setExportProgress(progress);
				} else if (status === ExportProgressState.Closing || status === ExportProgressState.QueuingItems) {
					// We don't have a numeric progress value and the closing/queuing state may take a while.
					// Set a special progress value:
					setExportProgress(undefined);
				}
			});

			setExportStatus(ExportStatus.Exported);
			setWarnings(status.warnings.join('\n'));

			await Share.open({
				type: 'application/jex',
				filename: 'export.jex',
				url: `file://${exportTargetPath}`,
				failOnCancel: false,
			});
		} catch (e) {
			logger.error('Unable to export:', e);

			// Display a message to the user (e.g. in the case where the user is out of disk space).
			Alert.alert(_('Error'), _('Unable to export or share data. Reason: %s', e.toString()));
			setExportStatus(ExportStatus.NotStarted);
		} finally {
			await shim.fsDriver().remove(exportTargetPath);
		}
	}, [exportStatus]);

	if (exportStatus === ExportStatus.NotStarted || exportStatus === ExportStatus.Exporting) {
		const progressComponent = (
			<ProgressBar
				visible={exportStatus === ExportStatus.Exporting}
				indeterminate={exportProgress === undefined}
				progress={exportProgress}/>
		);
		const descriptionText = _('Share a copy of all notes in a file format that can be imported by Joplin on a computer.');

		const startOrCancelExportButton = (
			<ConfigScreenButton
				title={exportStatus === ExportStatus.Exporting ? _('Exporting...') : _('Export all notes as JEX')}
				disabled={exportStatus === ExportStatus.Exporting}
				description={exportStatus === ExportStatus.NotStarted ? descriptionText : null}
				statusComponent={progressComponent}
				clickHandler={startExport}
				styles={props.styles}
			/>
		);

		return startOrCancelExportButton;
	} else {
		const warningComponent = (
			<Text style={props.styles.warningText}>
				{_('Warnings:\n%s', warnings)}
			</Text>
		);

		const exportSummary = (
			<View style={props.styles.settingContainer}>
				<Text style={props.styles.descriptionText}>{_('Exported successfully!')}</Text>
				{warnings.length > 0 ? warningComponent : null}
			</View>
		);
		return exportSummary;
	}
};

export default NoteExportButton;
