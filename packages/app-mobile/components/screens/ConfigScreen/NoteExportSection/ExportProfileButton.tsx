import * as React from 'react';

import { useCallback, useState } from 'react';
import { View, Button } from 'react-native';
import { TextInput } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import exportProfile from './utils/exportProfile';
import { ConfigScreenStyles } from '../configScreenStyles';
import SettingsButton from '../SettingsButton';

interface Props {
	styles: ConfigScreenStyles;
}

const ExportProfileButton = (props: Props) => {
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
		<SettingsButton
			styles={props.styles}
			title={profileExportStatus === 'exporting' ? _('Exporting profile...') : _('Export profile')}
			clickHandler={exportProfileButtonPress}
			description={_('For debugging purpose only: export your profile to an external SD card.')}
			disabled={profileExportStatus === 'exporting'}
		/>
	);

	const exportProfileButtonPress2 = useCallback(async () => {
		setProfileExportStatus('exporting');

		await exportProfile(profileExportPath);

		setProfileExportStatus('idle');
	}, [profileExportPath]);

	const profileExportPrompt = (
		<View>
			<TextInput
				label={_('Path:')}
				onChangeText={text => setProfileExportPath(text)}
				value={profileExportPath}
				placeholder="/path/to/sdcard"
				keyboardAppearance={props.styles.keyboardAppearance} />
			<Button
				onPress={exportProfileButtonPress2}
				title={_('OK')}
			/>
		</View>
	);

	const mainContent = (
		<>
			{exportProfileButton}
			{profileExportStatus === 'prompt' ? profileExportPrompt : null}
		</>
	);

	// The debug functionality is only supported on Android.
	if (shim.mobilePlatform() !== 'android') {
		return null;
	}

	return mainContent;
};

export default ExportProfileButton;
