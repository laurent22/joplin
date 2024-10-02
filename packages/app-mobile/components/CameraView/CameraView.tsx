import * as React from 'react';
import { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { connect } from 'react-redux';
import { Text, StyleSheet, Linking, View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { ViewStyle } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { DialogContext } from '../DialogManager';
import { AppState } from '../../utils/types';
import ActionBar from './ActionBar';
import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import Setting from '@joplin/lib/models/Setting';
import { LinkButton, PrimaryButton } from '../buttons';
import BackButtonService from '../../services/BackButtonService';
import { themeStyle } from '../global-style';

interface CameraData {
	uri: string;
}

interface Props {
	themeId: number;
	style: ViewStyle;
	cameraType: CameraDirection;
	cameraRatio: string;
	onPhoto: (data: CameraData)=> void;
	onCancel: ()=> void;
}

interface UseStyleProps {
	themeId: number;
	style: ViewStyle;
}

const useStyles = ({ themeId, style }: UseStyleProps) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				position: 'relative',
				...style,
			},
			errorContainer: {
				backgroundColor: theme.backgroundColor,
				maxWidth: 600,
				marginLeft: 'auto',
				marginRight: 'auto',
				padding: 28,
				borderRadius: 28,
				...style,
			},
		});
	}, [themeId, style]);
};

const useAvailablePictureSizes = (cameraRef: RefObject<CameraView>, cameraReady: boolean) => {
	const [availablePictureSizes, setAvailablePictureSizes] = useState<string[]>([]);
	useAsyncEffect(async () => {
		if (!cameraReady) return;
		setAvailablePictureSizes(await cameraRef.current.getAvailablePictureSizesAsync());
	}, [cameraReady, cameraRef]);

	return availablePictureSizes;
};

const CameraViewComponent: React.FC<Props> = props => {
	const styles = useStyles(props);
	const cameraRef = useRef<CameraView|null>(null);
	const [hasPermission, requestPermission] = useCameraPermissions();
	const [cameraReady, setCameraReady] = useState(false);
	const dialogs = useContext(DialogContext);

	useAsyncEffect(async (event) => {
		if (!hasPermission?.granted) {
			const success = await requestPermission();
			if (event.cancelled) return;

			if (!success) {
				dialogs.prompt(
					_('Missing camera permission'),
					_('The camera permission is required to take pictures.'),
					[{ text: _('Open settings'), onPress: () => Linking.openSettings() }],
				);
			}
		}
	}, [hasPermission, requestPermission, dialogs]);

	useEffect(() => {
		const handler = () => {
			props.onCancel();
			return true;
		};
		BackButtonService.addHandler(handler);
		return () => {
			BackButtonService.removeHandler(handler);
		};
	}, [props.onCancel]);

	const onCameraReverse = useCallback(() => {
		const newDirection = props.cameraType === CameraDirection.Front ? CameraDirection.Back : CameraDirection.Front;
		Setting.setValue('camera.type', newDirection);
	}, [props.cameraType]);

	const availablePictureSizes = useAvailablePictureSizes(cameraRef, cameraReady);
	const onNextCameraRatio = useCallback(async () => {
		const ratioIndex = Math.max(0, availablePictureSizes.indexOf(props.cameraRatio));

		Setting.setValue('camera.ratio', availablePictureSizes[(ratioIndex + 1) % availablePictureSizes.length]);
	}, [props.cameraRatio, availablePictureSizes]);

	const onCameraReady = useCallback(() => {
		setCameraReady(true);
	}, []);

	const [takingPicture, setTakingPicture] = useState(false);
	const takingPictureRef = useRef(takingPicture);
	takingPictureRef.current = takingPicture;
	const onTakePicture = useCallback(async () => {
		if (takingPictureRef.current) return;
		setTakingPicture(true);
		try {
			const picture = await cameraRef.current.takePictureAsync();
			if (picture) {
				props.onPhoto(picture);
			}
		} finally {
			setTakingPicture(false);
		}
	}, [props.onPhoto]);

	if (!hasPermission?.canAskAgain && !hasPermission?.granted) {
		return <View style={styles.errorContainer}>
			<Text>{_('Missing camera permission')}</Text>
			<LinkButton onPress={() => Linking.openSettings()}>{_('Open settings')}</LinkButton>
			<PrimaryButton onPress={props.onCancel}>{_('Go back')}</PrimaryButton>
		</View>;
	}

	return (
		<CameraView
			ref={cameraRef}
			style={styles.container}
			facing={props.cameraType === CameraDirection.Front ? 'front' : 'back'}
			pictureSize={availablePictureSizes.includes(props.cameraRatio) ? props.cameraRatio : undefined}
			onCameraReady={onCameraReady}
		>
			<ActionBar
				themeId={props.themeId}
				onCameraReverse={onCameraReverse}
				cameraDirection={props.cameraType}
				cameraRatio={props.cameraRatio}
				onSetCameraRatio={onNextCameraRatio}
				onTakePicture={onTakePicture}
				takingPicture={takingPicture}
				onCancelPhoto={props.onCancel}
				cameraReady={cameraReady}
			/>
		</CameraView>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		cameraRatio: state.settings['camera.ratio'],
		cameraType: state.settings['camera.type'],
	};
};

export default connect(mapStateToProps)(CameraViewComponent);
