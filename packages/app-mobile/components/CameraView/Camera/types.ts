import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import { ViewStyle } from 'react-native';
import { BarcodeScanner } from '../utils/useBarcodeScanner';
import { CameraResult } from '../types';

export interface Props {
	style: ViewStyle;
	cameraType: CameraDirection;
	ratio: string|undefined;
	codeScanner: BarcodeScanner;

	onCameraReady: ()=> void;
	onPermissionRequestFailure: ()=> void;
	onHasPermission: ()=> void;
}

export interface CameraRef {
	takePictureAsync(): Promise<CameraResult>;
}
