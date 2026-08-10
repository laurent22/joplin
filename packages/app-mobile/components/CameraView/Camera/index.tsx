import * as React from 'react';
import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import { BarcodeSettings, CameraMountError, CameraRatio, CameraView, useCameraPermissions } from 'expo-camera';
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { CameraRef, Props } from './types';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('Camera/expo');

const barcodeScannerSettings: BarcodeSettings = {
	// Rocketbook pages use both QR and datamatrix
	barcodeTypes: ['qr', 'datamatrix'],
};

const Camera = (props: Props, ref: ForwardedRef<CameraRef>) => {
	const [camera, setCamera] = useState<CameraView|null>(null);
	const cameraRef = useRef<CameraView>(camera);
	cameraRef.current = camera;

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

	const onMountError = useCallback((event: CameraMountError) => {
		const message = _('Error starting camera: %s', event.message);
		logger.error(message);
	}, []);

	const isReadyRef = useRef(false);
	const onCameraReady = useCallback(() => {
		if (isReadyRef.current) return; // Already emitted

		isReadyRef.current = true;
		props.onCameraReady();
	}, [props.onCameraReady]);

	useAsyncEffect(async (event) => {
		// iOS issue workaround: Since upgrading to Expo SDK 52, closing and reopening the camera on iOS
		// never emits onCameraReady. As a workaround, call .resumePreview and wait for it to resolve,
		// rather than relying on the CameraView's onCameraReady prop.
		//
		// Update 12/23/2025: This also happens on certain Android devices.
		if (camera) {
			// Work around an issue on iOS where the onCameraReady callback is never called.
			// Instead, wait for the preview to start using resumePreview:
			await camera.resumePreview();
			if (event.cancelled) return;
			onCameraReady();
		}
	}, [camera, onCameraReady]);

	return hasPermission?.granted ? <CameraView
		ref={setCamera}
		style={props.style}
		facing={props.cameraType === CameraDirection.Front ? 'front' : 'back'}
		ratio={props.ratio as CameraRatio}
		onCameraReady={onCameraReady}
		onMountError={onMountError}
		animateShutter={false}
		barcodeScannerSettings={barcodeScannerSettings}
		onBarcodeScanned={props.codeScanner.onBarcodeScanned}
	/> : null;
};

export default forwardRef(Camera);
