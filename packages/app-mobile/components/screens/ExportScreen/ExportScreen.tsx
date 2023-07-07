import * as React from 'react';
import { View, Text, Alert } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
const { themeStyle } = require('../../global-style.js');
import Logger from '@joplin/lib/Logger';
import { Button } from 'react-native-paper';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from '../../../utils/types';
import { Theme } from '@joplin/lib/themes/type';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import Share from 'react-native-share';
import exportAllFolders, { makeExportCacheDirectory } from './exportAllFolders';

const logger = Logger.create('ExportScreen');

interface Props {
	noteId: string;
	themeId: number;
	dispatch: Dispatch;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme: Theme = themeStyle(themeId);

		const baseTextStyle = {
			color: theme.color,
			fontSize: (theme as any).fontSize ?? 12,
		};

		return {
			rootStyle: {
				backgroundColor: theme.backgroundColor,
				flex: 1,
			},
			statusTextStyle: {
				...baseTextStyle,
			},
			spacer: {
				flex: 1,
			},
		};
	}, [themeId]);
};

enum ExportStatus {
	NotStarted,
	Exporting,
	Exported,
}

export const ExportScreenComponent = (props: Props) => {
	const [exportStatus, setExportStatus] = useState<ExportStatus>(ExportStatus.NotStarted);

	const startExport = useCallback(async () => {
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
	}, []);

	const styles = useStyles(props.themeId);

	const startExportButton = (
		<Button
			mode='outlined'
			icon='share'
			onPress={startExport}
		>
			<Text>{_('Export to JEX')}</Text>
		</Button>
	);

	const exportInProgressMessage = (
		<>
			<Text style={styles.statusTextStyle}>{_('Export in progress...')}</Text>
		</>
	);

	const exportedSuccessfullyMessage = (
		<Text style={styles.statusTextStyle}>{_('Exported successfully!')}</Text>
	);

	let mainContent = null;
	if (exportStatus === ExportStatus.NotStarted) {
		mainContent = startExportButton;
	} else if (exportStatus === ExportStatus.Exporting) {
		mainContent = exportInProgressMessage;
	} else {
		mainContent = exportedSuccessfullyMessage;
	}

	return (
		<View style={styles.rootStyle}>
			<ScreenHeader title={_('Export')}/>
			{mainContent}
		</View>
	);
};

const ExportScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(ExportScreenComponent);

export default ExportScreen;
