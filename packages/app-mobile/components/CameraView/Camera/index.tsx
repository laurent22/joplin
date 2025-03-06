import * as React from 'react';
import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import { BarcodeSettings, CameraRatio, CameraView, useCameraPermissions } from 'expo-camera';
import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { CameraRef, Props } from './types';

const barcodeScannerSettings: BarcodeSettings = {
	// Rocketbook pages use both QR and datamatrix
	barcodeTypes: ['qr', 'datamatrix'],
};

const Camera = (props: Props, ref: ForwardedRef<CameraRef>) => {
	const cameraRef = useRef<CameraView>(null);

	useImperativeHandle(ref, () => ({
		takePictureAsync: async () => {
			const result = await cameraRef.current.takePictureAsync();
			return {
				uri: result.uri,
				type: 'image/jpg',
			};
		},
	}), []);

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
		barcodeScannerSettings={barcodeScannerSettings}
		onBarcodeScanned={props.codeScanner.onBarcodeScanned}
	/>;
};

export default forwardRef(Camera);
