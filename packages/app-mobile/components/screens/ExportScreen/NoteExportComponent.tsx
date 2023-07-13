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
			const status = await exportAllFolders(exportTargetPath);

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
		<Button
			icon={props.styles.shareButtonIconName}
			mode='contained'
			onPress={startExport}
			disabled={exportStatus === ExportStatus.Exporting}
			loading={exportStatus === ExportStatus.Exporting}
		>
			<Text>{exportStatus === ExportStatus.Exporting ? _('Exporting...') : _('Export as JEX')}</Text>
		</Button>
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
