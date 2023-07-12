import * as React from 'react';

import { useCallback, useState } from 'react';
import { ExportScreenStyles } from './useStyles';
import { Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import exportDebugReport from './utils/exportDebugReport';
import shim from '@joplin/lib/shim';
import exportProfile from './utils/exportProfile';
import SectionHeader from './SectionHeader';

interface Props {
	styles: ExportScreenStyles;
}

const ExportDebugComponent = (props: Props) => {
	const [creatingReport, setCreatingReport] = useState(false);

	const exportDebugButtonPress = useCallback(async () => {
		setCreatingReport(true);

		await exportDebugReport();

		setCreatingReport(false);
	}, [setCreatingReport]);

	const exportDebugReportButton = (
		<Button
			icon="share"
			mode="elevated"
			onPress={exportDebugButtonPress}
			disabled={creatingReport}
			loading={creatingReport}
		>
			{creatingReport ? _('Creating report...') : _('Export Debug Report')}
		</Button>
	);

	const [profileExportStatus, setProfileExportStatus] = useState<'idle'|'prompt'|'exporting'>('idle');
	const [profileExportPath, setProfileExportPath] = useState<string>('');

	const exportProfileButtonPress = useCallback(async () => {
		const externalDir = await shim.fsDriver().getExternalDirectoryPath();
		if (!externalDir) {
			return;
		}
		const p = profileExportPath ? profileExportPath : `${externalDir}/JoplinProfileExport`;

		setProfileExportStatus('prompt');
		setProfileExportPath(p);
	}, [profileExportPath]);

	const exportProfileButton = (
		<View style={props.styles.subsectionContainerStyle}>
			<Button
				icon="share"
				mode="elevated"
				onPress={exportProfileButtonPress}
				disabled={profileExportStatus === 'exporting'}
			>
				{profileExportStatus === 'exporting' ? _('Exporting profile...') : _('Export profile')}
			</Button>
			<Text style={props.styles.sectionDescriptionStyle}>
				{_('For debugging purpose only: export your profile to an external SD card.')}
			</Text>
		</View>
	);

	const exportProfileButtonPress2 = useCallback(async () => {
		setProfileExportStatus('exporting');

		await exportProfile(profileExportPath);

		setProfileExportStatus('idle');
	}, [profileExportPath]);

	const profileExportPrompt = (
		<View>
			<TextInput
				label="Path:"
				onChangeText={text => setProfileExportPath(text)}
				value={profileExportPath}
				placeholder="/path/to/sdcard"
				keyboardAppearance={props.styles.keyboardAppearance} />
			<Button onPress={exportProfileButtonPress2}>
				{_('OK')}
			</Button>
		</View>
	);

	const mainContent = (
		<>
			<SectionHeader
				title={_('Export Debug information')}
				description={_('The following items may be helpful when creating a bug report.')}
				styles={props.styles}
			/>

			<View style={props.styles.subsectionContainerStyle}>
				{exportDebugReportButton}
			</View>

			<View style={props.styles.subsectionContainerStyle}>
				{exportProfileButton}
				{profileExportStatus === 'prompt' ? profileExportPrompt : null}
			</View>
		</>
	);

	// The debug functionality is only supported on Android.
	if (shim.mobilePlatform() !== 'android') {
		return null;
	}

	return mainContent;
};

export default ExportDebugComponent;
