import * as React from 'react';
import { Text, Alert } from 'react-native';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import { Button } from 'react-native-paper';
import { useCallback, useState } from 'react';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import Share from 'react-native-share';
import exportAllFolders, { makeExportCacheDirectory } from './utils/exportAllFolders';
import { ExportScreenStyles } from './useStyles';

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

	const startExport = useCallback(async () => {
		// Don't run multiple exports at the same time.
		if (exportStatus === ExportStatus.Exporting) {
			return;
		}

		setExportStatus(ExportStatus.Exporting);
		const exportTargetPath = join(await makeExportCacheDirectory(), 'jex-export.jex');
		logger.info(`Exporting all folders to path ${exportTargetPath}`);

		try {
			await exportAllFolders(exportTargetPath);
			// TODO: Use exportResult.warnings

			await Share.open({
				type: 'application/jex',
				filename: 'export.jex',
				url: `file://${exportTargetPath}`,
				failOnCancel: false,
			});

			setExportStatus(ExportStatus.Exported);
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
		<Button
			icon={props.styles.shareButtonIconName}
			mode='contained'
			onPress={startExport}
			disabled={exportStatus === ExportStatus.Exporting}
			loading={exportStatus === ExportStatus.Exporting}
		>
			<Text>{exportStatus === ExportStatus.Exporting ? _('Exporting...') : _('Export to JEX')}</Text>
		</Button>
	);

	const exportedSuccessfullyMessage = (
		<Text style={props.styles.statusTextStyle}>{_('Exported successfully!')}</Text>
	);

	let mainContent = null;
	if (exportStatus === ExportStatus.NotStarted || exportStatus === ExportStatus.Exporting) {
		mainContent = startOrCancelExportButton;
	} else {
		mainContent = exportedSuccessfullyMessage;
	}

	return mainContent;
};

export default NoteExportComponent;
