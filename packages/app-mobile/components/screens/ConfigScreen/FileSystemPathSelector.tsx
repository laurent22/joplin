import * as React from 'react';

import shim from '@joplin/lib/shim';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { View, Text, StyleSheet } from 'react-native';
import Setting, { SettingItem } from '@joplin/lib/models/Setting';
import { openDocumentTree } from '@joplin/react-native-saf-x';
import { UpdateSettingValueCallback } from './types';
import { reg } from '@joplin/lib/registry';
import type FsDriverWeb from '../../../utils/fs-driver/fs-driver-rn.web';
import { IconButton, TouchableRipple } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';

type Mode = 'read'|'readwrite';

interface Props {
	themeId: number;
	styles: ConfigScreenStyles;
	settingMetadata: SettingItem;
	mode: Mode;
	description: React.ReactNode|null;
	updateSettingValue: UpdateSettingValueCallback;
}

type ExtendedSelf = (typeof window.self) & {
	showDirectoryPicker: (options: { id: string; mode: string })=> Promise<FileSystemDirectoryHandle>;
};
declare const self: ExtendedSelf;

const useFileSystemPath = (settingId: string, updateSettingValue: UpdateSettingValueCallback, accessMode: Mode) => {
	const [fileSystemPath, setFileSystemPath] = useState<string>('');

	useEffect(() => {
		setFileSystemPath(Setting.value(settingId));
	}, [settingId]);

	const showDirectoryPicker = useCallback(async () => {
		if (shim.mobilePlatform() === 'web') {
			// Directory picker IDs can't include certain characters.
			const pickerId = `setting-${settingId}`.replace(/[^a-zA-Z]/g, '_');
			try {
				const handle = await self.showDirectoryPicker({ id: pickerId, mode: accessMode });
				const fsDriver = shim.fsDriver() as FsDriverWeb;
				const uri = await fsDriver.mountExternalDirectory(handle, pickerId, accessMode);
				await updateSettingValue(settingId, uri);
				setFileSystemPath(uri);
			} catch (error) {
				if (error.name !== 'AbortError') throw error;
			}
		} else {
			try {
				const doc = await openDocumentTree(true);
				if (doc?.uri) {
					setFileSystemPath(doc.uri);
					await updateSettingValue(settingId, doc.uri);
				} else {
					throw new Error('User cancelled operation');
				}
			} catch (e) {
				reg.logger().info('Didn\'t pick sync dir: ', e);
			}
		}
	}, [updateSettingValue, settingId, accessMode]);

	const clearPath = useCallback(() => {
		setFileSystemPath('');
		void updateSettingValue(settingId, '');
	}, [updateSettingValue, settingId]);

	// Supported on Android and some versions of Chrome
	const supported = shim.fsDriver().isUsingAndroidSAF() || (shim.mobilePlatform() === 'web' && 'showDirectoryPicker' in self);

	return { clearPath, showDirectoryPicker, fileSystemPath, supported };
};

const pathSelectorStyles = StyleSheet.create({
	innerContainer: {
		paddingTop: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		paddingRight: 0,
	},
	mainButton: {
		flexGrow: 1,
		flexShrink: 1,
		paddingHorizontal: 16,
		paddingVertical: 22,
		margin: 0,
	},
	buttonContent: {
		flexDirection: 'row',
	},
});

const FileSystemPathSelector: FunctionComponent<Props> = props => {
	const settingId = props.settingMetadata.key;
	const { clearPath, showDirectoryPicker, fileSystemPath, supported } = useFileSystemPath(settingId, props.updateSettingValue, props.mode);

	const styleSheet = props.styles.styleSheet;

	const clearButton = (
		<IconButton
			icon='delete'
			accessibilityLabel={_('Clear')}
			onPress={clearPath}
		/>
	);

	const containerStyles = props.styles.getContainerStyle(!!props.description);

	const control = <View style={[containerStyles.innerContainer, pathSelectorStyles.innerContainer]}>
		<TouchableRipple
			onPress={showDirectoryPicker}
			style={pathSelectorStyles.mainButton}
			role='button'
		>
			<View style={pathSelectorStyles.buttonContent}>
				<Text key="label" style={styleSheet.settingText}>
					{props.settingMetadata.label()}
				</Text>
				<Text style={styleSheet.settingControl} numberOfLines={1}>
					{fileSystemPath}
				</Text>
			</View>
		</TouchableRipple>
		{fileSystemPath ? clearButton : null}
	</View>;

	if (!supported) return null;

	return <View style={containerStyles.outerContainer}>
		{control}
		{props.description}
	</View>;
};

export default FileSystemPathSelector;
