import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { connect } from 'react-redux';
import { Text, StyleSheet, Linking, View, Platform, useWindowDimensions } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { ViewStyle } from 'react-native';
import { CameraRatio, CameraView, useCameraPermissions } from 'expo-camera';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { DialogContext } from '../DialogManager';
import { AppState } from '../../utils/types';
import ActionButtons from './ActionButtons';
import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import Setting from '@joplin/lib/models/Setting';
import { LinkButton, PrimaryButton } from '../buttons';
import BackButtonService from '../../services/BackButtonService';
import { themeStyle } from '../global-style';
import fitRectIntoBounds from './utils/fitRectIntoBounds';
import useBarcodeScanner from './utils/useBarcodeScanner';
import ScannedBarcodes from './ScannedBarcodes';

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
	onInsertBarcode: (barcodeText: string)=> void;
}

interface UseStyleProps {
	themeId: number;
	style: ViewStyle;
	cameraRatio: string;
}

const useStyles = ({ themeId, style, cameraRatio }: UseStyleProps) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const outputPositioning = useMemo((): ViewStyle => {
		const ratioMatch = cameraRatio.match(/^(\d+):(\d+)$/);
		if (!ratioMatch) {
			return { left: 0, top: 0 };
		}
		const output = fitRectIntoBounds({
			width: Number(ratioMatch[2]),
			height: Number(ratioMatch[1]),
		}, {
			width: Math.min(screenWidth, screenHeight),
			height: Math.max(screenWidth, screenHeight),
		});

		if (screenWidth > screenHeight) {
			const w = output.width;
			output.width = output.height;
			output.height = w;
		}

		return {
			left: (screenWidth - output.width) / 2,
			top: (screenHeight - output.height) / 2,
			width: output.width,
			height: output.height,
			flexBasis: output.height,
			flexGrow: 0,
			alignContent: 'center',
		};
	}, [cameraRatio, screenWidth, screenHeight]);

	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				backgroundColor: '#000',
				...style,
			},
			camera: {
				position: 'relative',
				...outputPositioning,
				...style,
			},
			errorContainer: {
				backgroundColor: theme.backgroundColor,
				maxWidth: 600,
				marginLeft: 'auto',
				marginRight: 'auto',
				padding: 28,
				borderRadius: 28,
			},
		});
	}, [themeId, style, outputPositioning]);
};

const androidRatios: CameraRatio[] = ['1:1', '4:3', '16:9'];
const iOSRatios: CameraRatio[] = [];
const useAvailableRatios = (): string[] => {
	return Platform.OS === 'android' ? androidRatios : iOSRatios;
};


const CameraViewComponent: React.FC<Props> = props => {
	const styles = useStyles(props);
	const cameraRef = useRef<CameraView|null>(null);
	const [hasPermission, requestPermission] = useCameraPermissions();
	const [requestingPermission, setRequestingPermission] = useState(true);
	const [cameraReady, setCameraReady] = useState(false);
	const dialogs = useContext(DialogContext);

	useAsyncEffect(async () => {
		try {
			if (!hasPermission?.granted) {
				setRequestingPermission(true);
				await requestPermission();
			}
		} finally {
			setRequestingPermission(false);
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

	const availableRatios = useAvailableRatios();
	const onNextCameraRatio = useCallback(async () => {
		const ratioIndex = Math.max(0, availableRatios.indexOf(props.cameraRatio));

		Setting.setValue('camera.ratio', availableRatios[(ratioIndex + 1) % availableRatios.length]);
	}, [props.cameraRatio, availableRatios]);

	const codeScanner = useBarcodeScanner();

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

	let content;
	if (!hasPermission?.canAskAgain && !hasPermission?.granted && !requestingPermission) {
		content = <View style={styles.errorContainer}>
			<Text>{_('Missing camera permission')}</Text>
			<LinkButton onPress={() => Linking.openSettings()}>{_('Open settings')}</LinkButton>
			<PrimaryButton onPress={props.onCancel}>{_('Go back')}</PrimaryButton>
		</View>;
	} else {
		content = <>
			<CameraView
				ref={cameraRef}
				style={styles.camera}
				facing={props.cameraType === CameraDirection.Front ? 'front' : 'back'}
				ratio={availableRatios.includes(props.cameraRatio) ? (props.cameraRatio as CameraRatio) : undefined}
				onCameraReady={onCameraReady}
				animateShutter={false}
				barcodeScannerSettings={codeScanner.scannerSettings}
				onBarcodeScanned={codeScanner.onBarcodeScanned}
			>
			</CameraView>
			<ActionButtons
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
			<ScannedBarcodes
				themeId={props.themeId}
				codeScanner={codeScanner}
				onInsertCode={props.onInsertBarcode}
			/>
		</>;
	}

	return (
		<View style={styles.container}>
			{content}
		</View>
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
