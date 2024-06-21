import * as React from 'react';

import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import exportDebugReport from './utils/exportDebugReport';
import shim from '@joplin/lib/shim';
import SettingsButton from '../SettingsButton';
import { ConfigScreenStyles } from '../configScreenStyles';

interface Props {
	styles: ConfigScreenStyles;
}

export const exportDebugReportTitle = () => _('Export Debug Report');

const ExportDebugReportButton = (props: Props) => {
	const [creatingReport, setCreatingReport] = useState(false);

	const exportDebugButtonPress = useCallback(async () => {
		setCreatingReport(true);

		await exportDebugReport();

		setCreatingReport(false);
	}, [setCreatingReport]);

	const exportDebugReportButton = (
		<SettingsButton
			title={creatingReport ? _('Creating report...') : exportDebugReportTitle()}
			clickHandler={exportDebugButtonPress}
			styles={props.styles}
			disabled={creatingReport}
		/>
	);

	// The debug functionality is only supported on Android.
	if (shim.mobilePlatform() !== 'android') {
		return null;
	}

	return exportDebugReportButton;
};

export default ExportDebugReportButton;
