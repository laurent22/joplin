import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import { CameraRatio, CameraView, useCameraPermissions } from 'expo-camera';
import * as React from 'react';
import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ViewStyle } from 'react-native';
import { BarcodeScanner } from './utils/useBarcodeScanner';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

interface Props {
	style: ViewStyle;
	cameraType: CameraDirection;
	ratio: string|undefined;
	codeScanner: BarcodeScanner;

	onCameraReady: ()=> void;
	onPermissionRequestFailure: ()=> void;
	onHasPermission: ()=> void;
}

interface Picture {
	uri: string;
}

export interface CameraRef {
	takePictureAsync(): Promise<Picture>;
}

const Camera = (props: Props, ref: ForwardedRef<CameraRef>) => {
	const cameraRef = useRef<CameraView>(null);

	useImperativeHandle(ref, () => ({
		takePictureAsync: async () => {
			return cameraRef.current.takePictureAsync();
		},
	}));

	const [hasPermission, requestPermission] = useCameraPermissions();
	useAsyncEffect(async () => {
		try {
			if (!hasPermission?.granted) {
				await requestPermission();
			}
		} finally {
			if (!!hasPermission && !hasPermission.canAskAgain) {
				props.onPermissionRequestFailure();
			}
		}
	}, [hasPermission, requestPermission, props.onPermissionRequestFailure]);

	useEffect(() => {
		if (hasPermission?.granted) {
			props.onHasPermission();
		}
	}, [hasPermission, props.onHasPermission]);

	return <CameraView
		ref={cameraRef}
		style={props.style}
		facing={props.cameraType === CameraDirection.Front ? 'front' : 'back'}
		ratio={props.ratio as CameraRatio}
		onCameraReady={props.onCameraReady}
		animateShutter={false}
		barcodeScannerSettings={props.codeScanner.scannerSettings}
		onBarcodeScanned={props.codeScanner.onBarcodeScanned}
	/>;
};

export default forwardRef(Camera);
