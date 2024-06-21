import * as React from 'react';

import shim from '@joplin/lib/shim';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { TouchableNativeFeedback, View, Text } from 'react-native';
import Setting, { SettingItem } from '@joplin/lib/models/Setting';
import { openDocumentTree } from '@joplin/react-native-saf-x';
import { UpdateSettingValueCallback } from './types';
import { reg } from '@joplin/lib/registry';

interface Props {
	styles: ConfigScreenStyles;
	settingMetadata: SettingItem;
	updateSettingValue: UpdateSettingValueCallback;
}

const FileSystemPathSelector: FunctionComponent<Props> = props => {
	const [fileSystemPath, setFileSystemPath] = useState<string>('');

	const settingId = props.settingMetadata.key;

	useEffect(() => {
		setFileSystemPath(Setting.value(settingId));
	}, [settingId]);

	const selectDirectoryButtonPress = useCallback(async () => {
		try {
			const doc = await openDocumentTree(true);
			if (doc?.uri) {
				setFileSystemPath(doc.uri);
				await props.updateSettingValue(settingId, doc.uri);
			} else {
				throw new Error('User cancelled operation');
			}
		} catch (e) {
			reg.logger().info('Didn\'t pick sync dir: ', e);
		}
	}, [props.updateSettingValue, settingId]);

	// Unsupported on non-Android platforms.
	if (!shim.fsDriver().isUsingAndroidSAF()) {
		return null;
	}

	const styleSheet = props.styles.styleSheet;

	return (
		<TouchableNativeFeedback
			onPress={selectDirectoryButtonPress}
			style={styleSheet.settingContainer}
		>
			<View style={styleSheet.settingContainer}>
				<Text key="label" style={styleSheet.settingText}>
					{props.settingMetadata.label()}
				</Text>
				<Text style={styleSheet.settingControl}>
					{fileSystemPath}
				</Text>
			</View>
		</TouchableNativeFeedback>
	);
};

export default FileSystemPathSelector;
