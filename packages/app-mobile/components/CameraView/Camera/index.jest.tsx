import * as React from 'react';
import { ForwardedRef, forwardRef, useImperativeHandle } from 'react';
import { CameraRef, Props } from './types';
import { PrimaryButton } from '../../buttons';
import { Surface, Text } from 'react-native-paper';
import shim from '@joplin/lib/shim';

const Camera = (props: Props, ref: ForwardedRef<CameraRef>) => {
	useImperativeHandle(ref, () => ({
		takePictureAsync: async () => {
			const path = `${shim.fsDriver().getCacheDirectoryPath()}/test-photo.svg`;
			await shim.fsDriver().writeFile(
				path,
				`<svg viewBox="0 0 232 78" width="232" height="78" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
					<text style="font-family: serif; font-size: 104px; fill: rgb(128, 51, 128);">Test!</text>
				</svg>`,
				'utf8',
			);
			return { uri: path, type: 'image/svg+xml' };
		},
	}));

	return <Surface elevation={1}>
		<Text>Camera mock</Text>
		<PrimaryButton onPress={props.onPermissionRequestFailure}>Reject permission</PrimaryButton>
		<PrimaryButton onPress={props.onHasPermission}>Accept permission</PrimaryButton>
		<PrimaryButton onPress={props.onCameraReady}>On camera ready</PrimaryButton>
	</Surface>;
};

export default forwardRef(Camera);
