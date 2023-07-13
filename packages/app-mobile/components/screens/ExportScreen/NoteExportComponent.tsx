import * as React from 'react';
import { Text, Alert, Button } from 'react-native';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import { ProgressBar } from 'react-native-paper';
import { useCallback, useState } from 'react';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import Share from 'react-native-share';
import exportAllFolders, { makeExportCacheDirectory } from './utils/exportAllFolders';
import { ExportScreenStyles } from './useStyles';
import { ExportProgressState } from '@joplin/lib/services/interop/types';

const logger = Logger.create('NoteExportComponent');

interface Props {
	themeId: number;
	styles: ExportScreenStyles;
	dispatch: Dispatch;
}

enum ExportStatus {
	NotStarted,
	Exporting,
	Exported,
}

export const NoteExportComponent = (props: Props) => {
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

	const startOrCancelExportButton = (
		<>
			<ProgressBar
				visible={exportStatus === ExportStatus.Exporting}
				indeterminate={exportProgress === undefined}
				progress={exportProgress}/>
			<Button
				onPress={startExport}
				disabled={exportStatus === ExportStatus.Exporting}
				title={exportStatus === ExportStatus.Exporting ? _('Exporting...') : _('Export as JEX')}
			/>
		</>
	);

	const warningDisplay = (
		<Text style={props.styles.warningTextStyle}>
			{_('Warnings:\n%s', warnings)}
		</Text>
	);

	const postExportMessage = (
		<>
			<Text style={props.styles.statusTextStyle}>{_('Exported successfully!')}</Text>
			{warnings.length > 0 ? warningDisplay : null}
		</>
	);

	let mainContent = null;
	if (exportStatus === ExportStatus.NotStarted || exportStatus === ExportStatus.Exporting) {
		mainContent = startOrCancelExportButton;
	} else {
		mainContent = postExportMessage;
	}

	return mainContent;
};

export default NoteExportComponent;
